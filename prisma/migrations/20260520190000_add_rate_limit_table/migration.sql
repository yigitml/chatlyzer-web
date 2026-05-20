CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" varchar(255) PRIMARY KEY,
  "points" integer NOT NULL DEFAULT 0,
  "expire" bigint
);

CREATE INDEX IF NOT EXISTS "rate_limits_expire_idx" ON "rate_limits" ("expire");
