import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const artifact = resolve(".next/standalone");
if (!existsSync(resolve(artifact, "server.js")))
  throw new Error("Build first: standalone server artifact is missing");
mkdirSync(resolve(artifact, ".next"), { recursive: true });
cpSync(resolve(".next/static"), resolve(artifact, ".next/static"), {
  recursive: true,
});
if (existsSync("public"))
  cpSync(resolve("public"), resolve(artifact, "public"), { recursive: true });
const child = spawn(process.execPath, [resolve(artifact, "server.js")], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME || "0.0.0.0" },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
