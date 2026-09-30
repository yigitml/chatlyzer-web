import { readdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
const base = new URL(process.env.DATABASE_URL || "");
if (
  !base.pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1"].includes(base.hostname)
)
  throw new Error(
    "Migration upgrade tests require a disposable local _test database",
  );
const name = `chatlyzer_upgrade_${randomBytes(6).toString("hex")}_test`;
const admin = new pg.Client({ connectionString: base.href });
await admin.connect();
await admin.query(`CREATE DATABASE "${name}"`);
const target = new URL(base);
target.pathname = `/${name}`;
const client = new pg.Client({ connectionString: target.href });
try {
  await client.connect();
  const migrations = readdirSync("prisma/migrations")
    .filter((dir) => /^\d/.test(dir))
    .sort();
  for (const migration of migrations.filter((dir) => dir < "20260930"))
    await client.query(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  await client.query(`INSERT INTO "User"("id","name","email","googleId","updatedAt") VALUES ('legacy','Legacy','legacy@example.test','legacy-google',now()), ('duplicate','Duplicate','duplicate@example.test','legacy-google',now()), ('spent','Spent','spent@example.test','spent-google',now());
  INSERT INTO "UserCredit"("id","userId","type","amount","totalAmount","updatedAt") VALUES ('credit','legacy','ANALYSIS',40,64,now()), ('spent-credit','spent','ANALYSIS',0,24,now());
  INSERT INTO "UserSession"("id","userId","sessionId","lastActivityAt") VALUES ('session','legacy','reused',now());
  INSERT INTO "Chat"("id","userId","title","updatedAt") VALUES ('chat','legacy','Legacy chat',now());
  INSERT INTO "Analysis"("id","userId","chatId","result","status","updatedAt") VALUES ('result','legacy','chat','{"type":"vibe_check"}','PENDING',now()), ('interrupted','legacy','chat',null,'PROCESSING',now());
  INSERT INTO "RevenueCatPurchase"("id","revenueCatTransactionId","userId","productId","creditsGranted","rawPayload","storeTransactionId") VALUES ('sandbox','sandbox-transaction','legacy','credits_24',24,'{"is_sandbox":true}','sandbox-transaction'), ('unmapped','unmapped-transaction','legacy','credits_24',24,'{"is_sandbox":true}',null), ('unknown','unknown-transaction','legacy','credits_24',24,'{}',null), ('spent-purchase','spent-transaction','spent','credits_24',24,'{"is_sandbox":true}','spent-transaction');`);
  const additions = migrations.filter((dir) => dir >= "20260930");
  const first = readFileSync(
    `prisma/migrations/${additions[0]}/migration.sql`,
    "utf8",
  );
  await assert.rejects(
    client.query(first),
    /Duplicate Google subjects require explicit account reconciliation/,
  );
  await client.query(`DELETE FROM "User" WHERE "id" = 'duplicate'`);
  for (const migration of additions)
    await client.query(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  const credit = (
    await client.query(
      `SELECT "amount","sandboxAmount" FROM "UserCredit" WHERE "id"='credit'`,
    )
  ).rows[0];
  assert.deepEqual(credit, { amount: -8, sandboxAmount: 0 });
  const spent = (
    await client.query(
      `SELECT "amount","sandboxAmount" FROM "UserCredit" WHERE "id"='spent-credit'`,
    )
  ).rows[0];
  assert.deepEqual(spent, { amount: 0, sandboxAmount: 0 });
  const purchases = (
    await client.query(
      `SELECT "environment" FROM "RevenueCatPurchase" ORDER BY "id"`,
    )
  ).rows.map((row) => row.environment);
  assert.deepEqual(purchases, ["sandbox", "sandbox", "legacy", "legacy"]);
  const rows = (
    await client.query(
      `SELECT "id","status","error" FROM "Analysis" ORDER BY "id"`,
    )
  ).rows;
  assert.equal(rows[0].status, "FAILED");
  assert.match(rows[0].error, /Legacy interrupted/);
  assert.equal(rows[1].status, "COMPLETED");
  const session = (
    await client.query(
      `SELECT "loginGeneration","refreshTokenVersion" FROM "UserSession"`,
    )
  ).rows[0];
  assert.match(session.loginGeneration, /^[\da-f-]{36}$/);
  assert.equal(session.refreshTokenVersion, 0);
  console.log(
    "PASS forward upgrades: ambiguous identities blocked, legacy outputs preserved, interrupted jobs explicit, sandbox isolation and legacy debt, auth generations",
  );
} finally {
  await client.end();
  await admin.query(`DROP DATABASE "${name}"`);
  await admin.end();
}
