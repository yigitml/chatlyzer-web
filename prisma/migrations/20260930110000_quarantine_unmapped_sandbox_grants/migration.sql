-- Historical v1 non_subscriptions.id is not necessarily the signed webhook store
-- transaction_id. Do not make unmappable legacy grants spendable or issue refunds
-- against a guessed identity. Reconcile provider exports before releasing them.
WITH totals AS (
 SELECT "userId", SUM("creditsGranted")::integer AS amount
 FROM "RevenueCatPurchase" WHERE "environment" = 'sandbox' AND "deletedAt" IS NULL
 AND "storeTransactionId" IS NULL
 AND "rawPayload"->>'transaction_id' IS NULL
 AND "rawPayload"->>'store_transaction_id' IS NULL
 GROUP BY "userId"
)
UPDATE "UserCredit" c SET "sandboxAmount" = c."sandboxAmount" - t.amount
FROM totals t WHERE c."userId" = t."userId" AND c."type" = 'ANALYSIS';
UPDATE "RevenueCatPurchase" SET "environment" = 'legacy'
WHERE "environment" = 'sandbox' AND "storeTransactionId" IS NULL
AND "rawPayload"->>'transaction_id' IS NULL
AND "rawPayload"->>'store_transaction_id' IS NULL;
