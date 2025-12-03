import { PrismaClient } from "../../generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter }).$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        async findMany({ args, query }) {
          // Add deletedAt filter to exclude soft-deleted records
          if (!args) {
            args = {};
          }
          if (!args.where) {
            args.where = {};
          }
          
          // Only add the filter if deletedAt is not already specified
          if (!('deletedAt' in args.where)) {
            args.where.deletedAt = null;
          }
          
          return query(args);
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
