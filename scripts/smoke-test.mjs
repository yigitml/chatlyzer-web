import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "http://localhost:3000");
for (const path of ["/", "/home", "/auth/sign-in", "/profile", "/delete-account", "/contact"]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path} must render`);
  assert.match(await response.text(), /Chatlyzer/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  console.log(`PASS ${path}`);
}
const health = await fetch(new URL("/api/health", base));
assert.equal(health.status, 200);
assert.equal((await health.json()).checks.database, "ok");
const user = await fetch(new URL("/api/user", base));
assert.equal(user.status, 401, "Anonymous requests must not be authenticated");
const webhook = await fetch(new URL("/api/webhook/revenuecat", base), { method: "POST", body: "{}" });
assert.equal(webhook.status, 401);
console.log("PASS database health, anonymous auth, webhook authorization");
console.log("External login, AI and payment verification still requires real provider credentials.");
