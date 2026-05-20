import prisma from "@/backend/lib/prisma";
import { CreditType, Prisma } from "../../generated/client/client";

export async function consumeUserCredits(
  userId: string,
  creditType: CreditType,
  desiredAmount: number,
  tx?: Prisma.TransactionClient | any
): Promise<boolean> {
  const client = tx || prisma;

  const updatedRows = await client.$executeRaw`
    UPDATE "UserCredit"
    SET "amount" = "amount" - ${desiredAmount},
        "updatedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "type" = ${creditType}::"CreditType"
      AND "deletedAt" IS NULL
      AND "amount" - "minimumBalance" >= ${desiredAmount}
  `;

  if (updatedRows > 0) {
    return true;
  }

  const userCredit = await client.userCredit.findUnique({
    where: {
      userId_type: {
        userId,
        type: creditType,
      },
    },
  });

  if (!userCredit || userCredit.amount == null || userCredit.minimumBalance == null) {
    throw new Error("User credit data not found");
  }

  return false;
}

export async function refundUserCredits(
  userId: string,
  creditType: CreditType,
  amount: number,
  tx?: Prisma.TransactionClient | any
): Promise<boolean> {
  const client = tx || prisma;

  try {
    const userCredit = await client.userCredit.findUnique({
      where: {
        userId_type: {
          userId,
          type: creditType,
        },
      },
    });

    if (!userCredit) {
      console.error(`User credit record not found for refund: ${userId}, ${creditType}`);
      return false;
    }

    await client.userCredit.update({
      where: {
        userId_type: {
          userId,
          type: creditType,
        },
      },
      data: {
        amount: {
          increment: amount
        },
      },
    });

    return true;
  } catch (error) {
    console.error("Error refunding credits:", error);
    return false;
  }
}

export async function grantUserCredits(
  userId: string,
  creditType: CreditType,
  amount: number,
  tx?: Prisma.TransactionClient | any
): Promise<void> {
  const client = tx || prisma;

  await client.userCredit.upsert({
    where: {
      userId_type: {
        userId,
        type: creditType,
      },
    },
    update: {
      amount: { increment: amount },
      totalAmount: { increment: amount },
    },
    create: {
      userId,
      type: creditType,
      amount,
      totalAmount: amount,
    },
  });
}
