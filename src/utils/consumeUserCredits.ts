import { PrismaClient, CreditType } from "@prisma/client";

const prisma = new PrismaClient();

export async function consumeUserCredits(
  userId: string,
  creditType: CreditType,
  desiredAmount: number,
): Promise<boolean> {
  const userCredit = await prisma.userCredit.findUnique({
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

  await prisma.userCredit.update({
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
