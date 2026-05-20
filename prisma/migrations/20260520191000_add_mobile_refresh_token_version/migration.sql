ALTER TABLE "UserDevice"
ADD COLUMN IF NOT EXISTS "refreshTokenVersion" integer NOT NULL DEFAULT 0;
