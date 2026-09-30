// Loaded lazily by the standalone Deno entrypoint when its scheduled job runs.
export async function recoverInterruptedAnalyses() {
  const { reconcileAnalysisJobs } = await import("./backend/lib/analysisJobs");
  for (let batch = 0; batch < 10; batch++) {
    if ((await reconcileAnalysisJobs()) < 100) break;
  }
}
export function register() {}
