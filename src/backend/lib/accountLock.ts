import type { Prisma } from "@/generated/client";
import { ApiError } from "./apiBoundary";

/** Every content writer and account deletion use this lock and generation check. */
export async function lockActiveAccount(tx: Prisma.TransactionClient, userId: string, tokenVersion?: number) {
  const rows = await tx.$queryRaw<Array<{ id: string; isActive: boolean; deletedAt: Date | null; tokenVersion: number }>>`
    SELECT "id", "isActive", "deletedAt", "tokenVersion" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const user = rows[0];
  if (!user || !user.isActive || user.deletedAt || (tokenVersion !== undefined && user.tokenVersion !== tokenVersion)) {
    throw new ApiError("Account has been revoked", 401);
  }
  return user;
}
