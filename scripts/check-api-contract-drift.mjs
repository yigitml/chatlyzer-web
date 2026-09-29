import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const mobileRoot = process.env.CHATLYZER_MOBILE_ROOT || resolve(import.meta.dirname, "../../chatlyzer-mobile");
const checker = resolve(mobileRoot, "scripts/check-api-contract-drift.mjs");
if (!existsSync(checker)) {
  throw new Error("Clone yigitml/chatlyzer-mobile next to this repository, or set CHATLYZER_MOBILE_ROOT, to compare web/mobile contracts.");
}
process.env.CHATLYZER_WEB_ROOT = resolve(import.meta.dirname, "..");
await import(pathToFileURL(checker).href);
