import prisma from "../src/backend/lib/prisma";
import { reconcileAnalysisJobs } from "../src/backend/lib/analysisJobs";
// No request inputs or provider calls are involved: stale reservations only.
try {
  let reconciled = 0;
  let batch;
  do {
    batch = await reconcileAnalysisJobs();
    reconciled += batch;
  } while (batch === 100);
  console.log(`Reconciled ${reconciled} expired analysis reservations`);
} finally {
  await prisma.$disconnect();
}
