import prisma from "@/backend/lib/prisma";
import { CreditType, Prisma } from "../../generated/client/client";

type Client = Prisma.TransactionClient;
function positiveAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Credit amount must be a positive integer");
}
export function creditEnvironment(): "sandbox" | "production" {
  const mode = process.env.REVENUECAT_FULFILLMENT_MODE || "production";
  if (mode !== "sandbox" && mode !== "production") throw new Error("Invalid billing fulfillment mode");
  return mode;
}

export async function consumeUserCredits(userId: string, creditType: CreditType, desiredAmount: number, tx?: Client): Promise<boolean> {
  positiveAmount(desiredAmount);
  const client = tx || prisma;
  const rows = await client.$executeRaw`
    UPDATE "UserCredit" SET "amount" = "amount" - ${desiredAmount}, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "type" = ${creditType}::"CreditType" AND "deletedAt" IS NULL
    AND "amount" - "minimumBalance" >= ${desiredAmount}`;
  if (rows > 0) return true;
  const credit = await client.userCredit.findUnique({ where: { userId_type: { userId, type: creditType } } });
  if (!credit || credit.deletedAt) throw new Error("User credit data not found");
  return false;
}

// Jobs record the exact pool charged so mode changes never refund into another pool.
export async function debitJobCredits(userId: string, amount: number, tx: Client): Promise<string | null> {
  if (await consumeUserCredits(userId, CreditType.ANALYSIS, amount, tx)) return "production";
  if (creditEnvironment() !== "sandbox") return null;
  const rows = await tx.$executeRaw`UPDATE "UserCredit" SET "sandboxAmount" = "sandboxAmount" - ${amount}, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "type" = 'ANALYSIS'::"CreditType" AND "deletedAt" IS NULL AND "sandboxAmount" >= ${amount}`;
  return rows > 0 ? "sandbox" : null;
}

export async function refundUserCredits(userId: string, creditType: CreditType, amount: number, tx?: Client, environment = "production"): Promise<boolean> {
  positiveAmount(amount);
  const client = tx || prisma;
  const rows = environment === "sandbox"
    ? await client.$executeRaw`UPDATE "UserCredit" SET "sandboxAmount" = "sandboxAmount" + ${amount}, "updatedAt" = NOW() WHERE "userId" = ${userId} AND "type" = ${creditType}::"CreditType" AND "deletedAt" IS NULL`
    : await client.$executeRaw`UPDATE "UserCredit" SET "amount" = "amount" + ${amount}, "updatedAt" = NOW() WHERE "userId" = ${userId} AND "type" = ${creditType}::"CreditType" AND "deletedAt" IS NULL`;
  if (!rows) throw new Error("Active credit record not found for refund");
  return true;
}

export async function grantUserCredits(userId: string, creditType: CreditType, amount: number, tx?: Client, environment = "production"): Promise<void> {
  positiveAmount(amount);
  const client = tx || prisma;
  const current = await client.userCredit.findUnique({ where: { userId_type: { userId, type: creditType } } });
  if (current?.deletedAt) throw new Error("Cannot grant credits to a deleted balance");
  const sandbox = environment === "sandbox";
  await client.userCredit.upsert({
    where: { userId_type: { userId, type: creditType } },
    update: sandbox ? { sandboxAmount: { increment: amount }, sandboxTotalAmount: { increment: amount } } : { amount: { increment: amount }, totalAmount: { increment: amount } },
    create: { userId, type: creditType, ...(sandbox ? { sandboxAmount: amount, sandboxTotalAmount: amount } : { amount, totalAmount: amount }) },
  });
}
