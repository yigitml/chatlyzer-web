import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const artifact = ".next/standalone";
mkdirSync(`${artifact}/.next`, { recursive: true });
cpSync("scripts/register-deno-cron.mjs", `${artifact}/register-deno-cron.mjs`);
const entrypoint = `${artifact}/server.js`;
const server = readFileSync(entrypoint, "utf8");
const cronImport = 'import "./register-deno-cron.mjs";\n';
if (!server.startsWith(cronImport))
  writeFileSync(entrypoint, cronImport + server);
cpSync(".next/static", `${artifact}/.next/static`, { recursive: true });
cpSync("public", `${artifact}/public`, { recursive: true });
