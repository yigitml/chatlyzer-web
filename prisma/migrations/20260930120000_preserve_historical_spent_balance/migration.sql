-- Historical spending was recorded in amount before environment pools existed.
-- Reclassification must not make already-spent sandbox grants available again.
-- Offset only the historical deficit introduced alongside a positive test pool;
-- preserve the combined balance and any remaining quarantined purchase debt.
WITH offsets AS (
  SELECT "id", LEAST(-"amount"::bigint, "sandboxAmount"::bigint)::integer AS spent
  FROM "UserCredit"
  WHERE "type" = 'ANALYSIS' AND "deletedAt" IS NULL
    AND "amount" < 0 AND "sandboxAmount" > 0
)
UPDATE "UserCredit" c
SET "amount" = c."amount" + offsets.spent,
    "sandboxAmount" = c."sandboxAmount" - offsets.spent,
    "updatedAt" = CURRENT_TIMESTAMP
FROM offsets WHERE c."id" = offsets."id";
