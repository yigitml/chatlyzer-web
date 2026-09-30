import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Register before the import that starts Next.js's HTTP listener.
if (typeof globalThis.Deno?.cron === "function" && process.env.DATABASE_URL) {
  globalThis.Deno.cron(
    "Recover interrupted analyses",
    "* * * * *",
    { backoffSchedule: [1000, 5000, 10000] },
    async () => {
      const {
        recoverInterruptedAnalyses,
      } = require("./.next/server/instrumentation.js");
      await recoverInterruptedAnalyses();
    },
  );
}
