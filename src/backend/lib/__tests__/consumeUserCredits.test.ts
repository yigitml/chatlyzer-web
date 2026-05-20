import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/backend/lib/prisma", () => ({
  default: {
    $executeRaw: mocks.executeRaw,
    userCredit: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { consumeUserCredits } from "../consumeUserCredits";

describe("consumeUserCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(1);
    mocks.findUnique.mockResolvedValue({
      amount: 12,
      minimumBalance: 2,
    });
  });

  it("debits credits with one conditional SQL update", async () => {
    await expect(
      consumeUserCredits("user_123", "ANALYSIS" as any, 8),
    ).resolves.toBe(true);

    expect(mocks.executeRaw).toHaveBeenCalledOnce();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when the conditional debit does not update a row", async () => {
    mocks.executeRaw.mockResolvedValue(0);

    await expect(
      consumeUserCredits("user_123", "ANALYSIS" as any, 8),
    ).resolves.toBe(false);

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        userId_type: {
          userId: "user_123",
          type: "ANALYSIS",
        },
      },
    });
  });

  it("throws when the user has no credit record", async () => {
    mocks.executeRaw.mockResolvedValue(0);
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      consumeUserCredits("user_123", "ANALYSIS" as any, 8),
    ).rejects.toThrow("User credit data not found");
  });
});
