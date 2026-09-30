-- Earlier migrations classified every mapped sandbox receipt. A remaining
-- mapped legacy receipt was fulfilled by an old worker during rollout, with
-- credits still in the old amount field. Move that grant once into the test pool.
WITH late_grants AS (
  SELECT "userId", SUM("creditsGranted")::integer AS credits
  FROM "RevenueCatPurchase"
  WHERE "environment" = 'legacy' AND "deletedAt" IS NULL
    AND "storeTransactionId" IS NOT NULL AND "rawPayload"->>'is_sandbox' = 'true'
  GROUP BY "userId"
)
UPDATE "UserCredit" c
SET "amount" = c."amount" - g.credits,
    "sandboxAmount" = c."sandboxAmount" + g.credits,
    "sandboxTotalAmount" = c."sandboxTotalAmount" + g.credits,
    "updatedAt" = CURRENT_TIMESTAMP
FROM late_grants g
WHERE c."userId" = g."userId" AND c."type" = 'ANALYSIS' AND c."deletedAt" IS NULL;
UPDATE "RevenueCatPurchase" SET "environment" = 'sandbox'
WHERE "environment" = 'legacy' AND "storeTransactionId" IS NOT NULL
  AND "rawPayload"->>'is_sandbox' = 'true';
