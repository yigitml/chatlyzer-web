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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt ?? null,
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
