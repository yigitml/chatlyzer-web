import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  grantUserCredits: vi.fn(),
  userFindUnique: vi.fn(),
  transaction: vi.fn(),
  orderCreate: vi.fn(),
}));

vi.mock("@/backend/lib/consumeUserCredits", () => ({
  grantUserCredits: mocks.grantUserCredits,
}));

vi.mock("@/backend/lib/prisma", () => ({
  default: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
  rawPrisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/backend/lib/polarConfig", () => ({
  getPolarConfigForMode: () => ({
    productId: "product_123",
  }),
}));

import { handleOrderPaid } from "../polarWebhookHandlers";

const paidOrderPayload = {
  data: {
    id: "order_123",
    amount: 499,
    currency: "usd",
    product: {
      id: "product_123",
    },
    metadata: {
      userId: "user_123",
    },
    customer: {
      email: "buyer@example.com",
    },
  },
};

describe("handleOrderPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POLAR_PRODUCT_ID = "product_123";

    mocks.userFindUnique.mockResolvedValue({
      id: "user_123",
      email: "buyer@example.com",
      deletedAt: null,
      isActive: true,
    });
  });

  it("creates the order before granting credits in a single transaction", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        order: {
          create: mocks.orderCreate,
        },
      }),
    );

    await handleOrderPaid(paidOrderPayload, "production");

    expect(mocks.orderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        polarOrderId: "order_123",
        polarMode: "production",
        userId: "user_123",
        productId: "product_123",
        creditsGranted: 24,
        status: "paid",
      }),
    });
    expect(mocks.grantUserCredits).toHaveBeenCalledWith(
      "user_123",
      "ANALYSIS",
      24,
      expect.objectContaining({
        order: expect.any(Object),
      }),
    );
  });

  it("does not grant credits when the order uniqueness guard rejects a duplicate delivery", async () => {
    const duplicateOrderError = Object.assign(new Error("duplicate order"), {
      code: "P2002",
    });
    mocks.transaction.mockRejectedValue(duplicateOrderError);

    await handleOrderPaid(paidOrderPayload, "production");

    expect(mocks.grantUserCredits).not.toHaveBeenCalled();
  });
});
