import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

prisma.$use(async (params, next) => {
  const result = await next(params);

  if (params.model && params.action === "findMany") {
    if (!params.args) {
      params.args = {};
    }
    if (!params.args.where) {
      params.args.where = {};
    }
    params.args.where.deletedAt = null;
  }

  return result;
});

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
