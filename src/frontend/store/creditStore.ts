import { create } from "zustand";
import type { Subscription } from "../../generated/client";
import type { PublicCredit as UserCredit } from "@/shared/types/api/publicDtos";
import { useAuthStore } from "./authStore";
import {
  assertCurrentSession,
  registerAccountReset,
  sessionGeneration,
} from "./sessionScope";
import {
  isRevenueCatUserCancellation,
  purchaseRevenueCatCredits,
} from "@/frontend/lib/revenueCatWeb";

interface CreditState {
  credits: UserCredit[];
  subscription: Subscription | null;
  isLoading: boolean;
  isPurchasing: boolean;
  error: Error | null;
  fetchCredits: () => Promise<UserCredit[]>;
  fetchSubscription: () => Promise<Subscription | null>;
  purchaseCredits: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  initialize: () => Promise<void>;
}
export const useCreditStore = create<CreditState>((set, get) => ({
  credits: [],
  subscription: null,
  isLoading: false,
  isPurchasing: false,
  error: null,
  initialize: async () => {
    if (useAuthStore.getState().isAuthenticated)
      await Promise.all([get().fetchCredits(), get().fetchSubscription()]);
  },
  fetchCredits: async () => {
    const generation = sessionGeneration();
    set({ isLoading: true, error: null });
    try {
      const credits = await useAuthStore
        .getState()
        .getNetworkService()
        .fetchCredits();
      assertCurrentSession(generation);
      set({ credits, isLoading: false });
      return credits;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
  fetchSubscription: async () => {
    const generation = sessionGeneration();
    set({ isLoading: true, error: null });
    try {
      const subscription = await useAuthStore
        .getState()
        .getNetworkService()
        .fetchSubscription();
      assertCurrentSession(generation);
      set({ subscription, isLoading: false });
      return subscription;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
  restorePurchases: async () => {
    const generation = sessionGeneration();
    if (!useAuthStore.getState().isAuthenticated)
      throw new Error("Sign in to restore credits.");
    const sync = await useAuthStore
      .getState()
      .getNetworkService()
      .syncRevenueCatPurchases();
    assertCurrentSession(generation);
    await get().fetchCredits();
    const pending = sync as typeof sync & {
      pendingVerification?: number;
      message?: string;
    };
    if ((pending.pendingVerification || 0) > 0)
      throw new Error(
        pending.message ||
          "Purchase is awaiting provider verification. Check Restore credits again after confirmation.",
      );
  },
  purchaseCredits: async () => {
    const generation = sessionGeneration();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Sign in before buying credits.");
    try {
      set({ isPurchasing: true, error: null });
      await purchaseRevenueCatCredits(user, () =>
        assertCurrentSession(generation),
      );
      assertCurrentSession(generation);
      await get().restorePurchases();
      assertCurrentSession(generation);
      set({ isPurchasing: false });
    } catch (error) {
      assertCurrentSession(generation);
      if (isRevenueCatUserCancellation(error)) {
        set({ isPurchasing: false });
        return;
      }
      set({ error: error as Error, isPurchasing: false });
      throw error;
    }
  },
}));
registerAccountReset(() =>
  useCreditStore.setState({
    credits: [],
    subscription: null,
    isLoading: false,
    isPurchasing: false,
    error: null,
  }),
);
