import { PrismaClient } from "../../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool as any);

  const baseClient = new PrismaClient({ adapter });

  const extendedClient = baseClient.$extends({
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

  return { baseClient, extendedClient };
};

type PrismaClientPair = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prismaPair: PrismaClientPair | undefined;
};

const prismaPair = globalForPrisma.prismaPair ?? prismaClientSingleton();

/**
 * Extended Prisma client with soft-delete filtering on findMany.
 * Use this for most queries.
 */
const prisma = prismaPair.extendedClient;

/**
 * Raw Prisma client without extensions.
 * Use this for new models/fields that the $extends wrapper can't resolve
 * (e.g. Order, polarCustomerId).
 * Cast to PrismaClient to restore full type access since the adapter
 * constructor produces PrismaClient<never, ...>.
 */
export const rawPrisma = prismaPair.baseClient as unknown as PrismaClient;

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaPair = prismaPair;
