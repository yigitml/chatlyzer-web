import { spawnSync } from "node:child_process";
// Never apply the resulting SQL. Use only a fresh migrated disposable database.
const url = new URL(process.env.DATABASE_URL || "");
if (
  !url.pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
) {
  throw new Error(
    "Schema consistency requires a local disposable database ending in _test",
  );
}
const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code",
    "--script",
  ],
  { encoding: "utf8", env: process.env },
);
if (result.status !== 0) {
  console.error(result.stdout, result.stderr);
  throw new Error(
    `Schema drift detected (exit ${result.status}); SQL was printed only, never applied`,
  );
}
console.log(
  "PASS migrated database matches Prisma schema; no destructive diff",
);
