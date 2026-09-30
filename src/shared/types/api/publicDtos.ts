type UserLike = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  isOnboarded: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLoginAt?: Date | string | null;
};

export type PublicUser = ReturnType<typeof toPublicUser>;

export function toPublicUser(user: UserLike) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    isOnboarded: user.isOnboarded,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
  };
}

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  isOnboarded: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

/** Credit wire fields keep test balances explicit; the server determines eligibility. */
export type PublicCredit = {
  id: string; userId: string; type: "ANALYSIS"; subscriptionId: string | null;
  totalAmount: number; amount: number; minimumBalance: number;
  sandboxAmount: number; sandboxTotalAmount: number;
  createdAt: string; updatedAt: string; deletedAt: string | null;
  availableAmount: number; canAnalyze: boolean; billingEnvironment: "sandbox" | "production";
};
