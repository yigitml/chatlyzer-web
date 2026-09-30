import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { StateCreator } from "zustand/vanilla";

const fake = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  fetchCredits: vi.fn(),
  fetchSubscription: vi.fn(),
  fetchChats: vi.fn(),
  fetchMessages: vi.fn(),
  fetchAnalyzes: vi.fn(),
  createPrivacyAnalysis: vi.fn(),
  createAnalysis: vi.fn(),
  syncRevenueCatPurchases: vi.fn(),
}));
const hookState = vi.hoisted(() => ({
  values: [] as unknown[],
  overrides: {} as Record<number, unknown>,
}));
vi.mock("@/shared/utils/network", () => ({ createNetworkService: () => fake }));
vi.mock("@/frontend/lib/revenueCatWeb", () => ({
  resetRevenueCatIdentity: vi.fn(),
  isRevenueCatUserCancellation: () => false,
  purchaseRevenueCatCredits: vi.fn(),
}));
vi.mock("zustand", async () => {
  const { createStore } = await import("zustand/vanilla");
  return {
    create: <T>(initializer: StateCreator<T>) => {
      const state = createStore(initializer);
      return Object.assign(
        (selector: (value: T) => unknown = (value) => value) =>
          selector(state.getState()),
        state,
      );
    },
  };
});
vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    useState: (initial: unknown) => {
      const index = hookState.values.length;
      initial = hookState.overrides[index] ?? initial;
      hookState.values.push(initial);
      return [
        initial,
        (value: unknown) => {
          hookState.values[index] =
            typeof value === "function"
              ? value(hookState.values[index])
              : value;
        },
      ];
    },
    useEffect: () => {},
    useRef: (initial: unknown) => ({ current: initial }),
  };
});
import { useAuthStore } from "@/frontend/store/authStore";
import { useChatStore } from "@/frontend/store/chatStore";
import { useMessageStore } from "@/frontend/store/messageStore";
import { useAnalysisStore } from "@/frontend/store/analysisStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { useAnalysisManagement } from "@/frontend/hooks/use-analysis-management";
import { useChatManagement } from "@/frontend/hooks/use-chat-management";

const userA = { id: "user-a", name: "A", email: "a@example.test" };
const userB = { id: "user-b", name: "B", email: "b@example.test" };
const privacyData = {
  title: "Private",
  isGhostMode: false,
  messages: [
    { sender: "A", content: "Hello", timestamp: new Date(0), metadata: null },
  ],
};
const privateResult = {
  chat: { id: "private-chat" },
  analyses: [
    {
      id: "private-analysis",
      chatId: "private-chat",
      status: "COMPLETED",
      result: { type: "vibe_check" },
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  hookState.values = [];
  hookState.overrides = {};
  vi.stubGlobal("localStorage", { removeItem: vi.fn(), setItem: vi.fn() });
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setUser(userA as never);
  fake.fetchCredits.mockResolvedValue([]);
  fake.fetchSubscription.mockResolvedValue(null);
  fake.fetchAnalyzes.mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("account and cookie session isolation", () => {
  it("loads credits and reconciles analysis status using HttpOnly-cookie readiness", async () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    await useCreditStore.getState().initialize();
    await useAnalysisStore.getState().checkAnalysisStatus("chat-a");
    expect(fake.fetchCredits).toHaveBeenCalledOnce();
    expect(fake.fetchSubscription).toHaveBeenCalledOnce();
    expect(fake.fetchAnalyzes).toHaveBeenCalledWith({
      chatId: "chat-a",
      includeInProgress: true,
    });
  });
  it("cookie polling reaches the API and stops once processing completes", async () => {
    vi.useFakeTimers();
    fake.fetchAnalyzes.mockResolvedValue([{ status: "PROCESSING" }]);
    const manager = useAnalysisManagement();
    manager.startPolling("chat-a");
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.fetchAnalyzes).toHaveBeenCalledOnce();
    fake.fetchAnalyzes.mockResolvedValue([{ status: "COMPLETED" }]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.fetchAnalyzes).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("logout clears all private state even when its HTTP request fails, and keeps the service usable", async () => {
    useChatStore.setState({
      chats: [{ id: "chat-a", title: "Private A" }] as never,
    });
    useMessageStore.setState({
      messages: [{ content: "Private message" }] as never,
    });
    useAnalysisStore.setState({
      analyzes: [{ result: { secret: true } }] as never,
    });
    useCreditStore.setState({ credits: [{ amount: 24 }] as never });
    fake.logout.mockRejectedValue(new Error("offline"));
    await expect(useAuthStore.getState().logout()).rejects.toThrow("offline");
    expect(useChatStore.getState().chats).toEqual([]);
    expect(useMessageStore.getState().messages).toEqual([]);
    expect(useAnalysisStore.getState().analyzes).toEqual([]);
    expect(useCreditStore.getState().credits).toEqual([]);
    fake.login.mockResolvedValue({ user: userB });
    fake.updateUser.mockResolvedValue(userB);
    await useAuthStore
      .getState()
      .login({ idToken: "fake", sessionId: "fake-session" });
    await expect(
      useAuthStore.getState().updateUser({ name: "B" }),
    ).resolves.toEqual(userB);
    expect(fake.updateUser).toHaveBeenCalledOnce();
  });
  it.each(["chats", "messages", "analyses", "credits"])(
    "rejects a delayed prior-account %s response",
    async (resource) => {
      let resolve!: (data: unknown) => void;
      const delayed = new Promise((resolveReply) => {
        resolve = resolveReply;
      });
      const operations = {
        chats: () => {
          fake.fetchChats.mockReturnValue(delayed);
          return useChatStore.getState().fetchChats();
        },
        messages: () => {
          fake.fetchMessages.mockReturnValue(delayed);
          return useMessageStore.getState().fetchMessages({ chatId: "a" });
        },
        analyses: () => {
          fake.fetchAnalyzes.mockReturnValue(delayed);
          return useAnalysisStore.getState().fetchAnalyzes();
        },
        credits: () => {
          fake.fetchCredits.mockReturnValue(delayed);
          return useCreditStore.getState().fetchCredits();
        },
      };
      const pending = operations[resource as keyof typeof operations]();
      useAuthStore.getState().setUser(userB as never);
      resolve([{ id: "private-a", userId: "user-a", content: "secret" }]);
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(useChatStore.getState().chats).toEqual([]);
      expect(useMessageStore.getState().messages).toEqual([]);
      expect(useAnalysisStore.getState().analyzes).toEqual([]);
      expect(useCreditStore.getState().credits).toEqual([]);
    },
  );
  it("account deletion invalidates identity and private data after a concrete success", async () => {
    useChatStore.setState({ chats: [{ id: "a" }] as never });
    fake.deleteUser.mockResolvedValue(undefined);
    await useAuthStore.getState().deleteUser();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useChatStore.getState().chats).toEqual([]);
  });
});

describe("purchase recovery", () => {
  it("keeps a pending provider verification visible instead of claiming restored credits", async () => {
    fake.syncRevenueCatPurchases.mockResolvedValue({ creditsGranted: 0, processedTransactions: 0, pendingVerification: 1, message: "Waiting for signed purchase verification" });
    await expect(useCreditStore.getState().restorePurchases()).rejects.toThrow("Waiting for signed purchase verification");
    expect(fake.fetchCredits).toHaveBeenCalledOnce();
  });
});

describe("analysis request recovery", () => {
  it("reconciles provider failure and retries a failed analysis with a fresh key", async () => {
    vi.useFakeTimers();
    useCreditStore.setState({ credits: [{ amount: 8 }] as never });
    fake.createAnalysis
      .mockRejectedValueOnce(
        Object.assign(new Error("Provider unavailable"), { status: 500 }),
      )
      .mockResolvedValueOnce([
        { id: "completed", chatId: "a", status: "COMPLETED" },
      ]);
    fake.fetchAnalyzes.mockResolvedValue([
      { id: "failed", chatId: "a", status: "FAILED", result: {} },
    ]);
    const manager = useAnalysisManagement();
    await manager.handleAnalyzeChat("a", vi.fn());
    expect(useAnalysisStore.getState().analyzes[0].status).toBe("FAILED");
    await manager.handleAnalyzeChat("a", vi.fn());
    expect(fake.createAnalysis.mock.calls[0][0].requestKey).not.toEqual(
      fake.createAnalysis.mock.calls[1][0].requestKey,
    );
    manager.stopPolling();
    vi.clearAllTimers();
  });
  it("reuses a retained analysis key at zero credits when the response and status request were lost", async () => {
    vi.useFakeTimers();
    const credits = [{ amount: 8 }];
    useCreditStore.setState({ credits: credits as never });
    fake.createAnalysis
      .mockRejectedValueOnce(new Error("Network interrupted"))
      .mockResolvedValueOnce([
        { id: "done", chatId: "a", status: "COMPLETED" },
      ]);
    fake.fetchAnalyzes.mockRejectedValue(new Error("Status unavailable"));
    const manager = useAnalysisManagement();
    await manager.handleAnalyzeChat("a", vi.fn());
    credits[0].amount = 0;
    await manager.handleAnalyzeChat("a", vi.fn());
    expect(fake.createAnalysis).toHaveBeenCalledTimes(2);
    expect(fake.createAnalysis.mock.calls[0][0].requestKey).toEqual(
      fake.createAnalysis.mock.calls[1][0].requestKey,
    );
    manager.stopPolling();
    vi.clearAllTimers();
  });
});

describe("privacy and ghost result lifecycle", () => {
  it("upserts saved privacy results into the canonical dashboard collection", async () => {
    fake.createPrivacyAnalysis.mockResolvedValue(privateResult);
    await useAnalysisStore.getState().createPrivacyAnalysis(privacyData);
    await useAnalysisStore.getState().createPrivacyAnalysis(privacyData);
    expect(useAnalysisStore.getState().analyzes).toHaveLength(1);
    expect(
      useAnalysisManagement().getAnalysesByType("private-chat").VibeCheck,
    ).toMatchObject({ id: "private-analysis" });
  });
  it("ghost results never enter saved collections and closing discards the transient payload", async () => {
    vi.useFakeTimers();
    useCreditStore.setState({ credits: [{ amount: 24 }] as never });
    fake.createPrivacyAnalysis.mockResolvedValue(privateResult);
    const manager = useAnalysisManagement();
    await manager.handlePrivacyAnalysis(
      { ...privacyData, isGhostMode: true },
      vi.fn(),
    );
    expect(hookState.values[4]).toEqual(privateResult);
    expect(hookState.values[5]).toBe(true);
    expect(useAnalysisStore.getState().analyzes).toEqual([]);
    expect(useAnalysisStore.getState().privacyAnalyzes).toEqual([]);
    manager.closeGhostResults();
    expect(hookState.values[4]).toBeNull();
    expect(hookState.values[5]).toBe(false);
    vi.clearAllTimers();
  });
  it("a processing privacy reply keeps the draft and checks the same request key", async () => {
    vi.useFakeTimers();
    useCreditStore.setState({ credits: [{ amount: 24 }] as never });
    fake.createPrivacyAnalysis.mockResolvedValue({
      chat: null,
      analyses: [],
      job: { id: "job", status: "PROCESSING" },
    });
    const manager = useAnalysisManagement();
    expect(
      await manager.handlePrivacyAnalysis(privacyData, vi.fn()),
    ).toBeUndefined();
    await manager.handlePrivacyAnalysis(privacyData, vi.fn());
    const first = fake.createPrivacyAnalysis.mock.calls[0][0];
    const second = fake.createPrivacyAnalysis.mock.calls[1][0];
    expect(first.requestKey).toEqual(second.requestKey);
    expect(hookState.values[4]).toBeNull();
    vi.clearAllTimers();
  });
  it("a non-complete privacy outcome preserves the imported draft and keeps the modal open", async () => {
    hookState.overrides = {
      6: true,
      8: "Draft title",
      9: [
        {
          sender: "A",
          content: "Unsaved private text",
          timestamp: new Date(0),
        },
      ],
      12: "Export draft",
    };
    const manager = useChatManagement();
    const source = vi.fn().mockResolvedValue(undefined);
    await manager.handleCreateChat(vi.fn(), true, false, source);
    expect(source).toHaveBeenCalledOnce();
    expect(hookState.values[6]).toBe(true);
    expect(hookState.values[8]).toBe("Draft title");
    expect(hookState.values[9]).toEqual([
      { sender: "A", content: "Unsaved private text", timestamp: new Date(0) },
    ]);
    expect(hookState.values[12]).toBe("Export draft");
    expect(hookState.values[7]).toBe(false);
  });
  it("insufficient credits prevent a privacy request", async () => {
    expect(
      await useAnalysisManagement().handlePrivacyAnalysis(privacyData, vi.fn()),
    ).toBeUndefined();
    expect(fake.createPrivacyAnalysis).not.toHaveBeenCalled();
  });
});
