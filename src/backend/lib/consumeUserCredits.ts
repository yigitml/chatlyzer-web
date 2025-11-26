import prisma from "@/backend/lib/prisma";
import { CreditType, Prisma } from "@prisma/client";

export async function consumeUserCredits(
  userId: string,
  creditType: CreditType,
  desiredAmount: number,
  tx?: Prisma.TransactionClient | any
): Promise<boolean> {
  const client = tx || prisma;

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

  const availableCredits = userCredit.amount - userCredit.minimumBalance;

  if (availableCredits < desiredAmount) {
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
      amount: userCredit.amount - desiredAmount,
    },
  });

  return true;
}
