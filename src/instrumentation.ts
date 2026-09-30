/** Deno Deploy discovers this job while the Next.js server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const deno = (
    globalThis as typeof globalThis & {
      Deno?: {
        cron: (
          name: string,
          schedule: string,
          options: { backoffSchedule: number[] },
          handler: () => Promise<void>,
        ) => unknown;
      };
    }
  ).Deno;
  // Previews without a database can still warm up public pages.
  if (typeof deno?.cron !== "function" || !process.env.DATABASE_URL) return;

  const { reconcileAnalysisJobs } = await import("./backend/lib/analysisJobs");
  deno.cron(
    "Recover interrupted analyses",
    "* * * * *",
    { backoffSchedule: [1000, 5000, 10000] },
    async () => {
      // Bound each execution; remaining batches are recovered on the next tick.
      for (let batch = 0; batch < 10; batch++) {
        if ((await reconcileAnalysisJobs()) < 100) break;
      }
    },
  );
}
