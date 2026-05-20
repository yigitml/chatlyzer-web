-- Add indexes for production API query patterns.
CREATE INDEX IF NOT EXISTS "Chat_userId_deletedAt_createdAt_idx"
  ON "Chat"("userId", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Chat_userId_title_deletedAt_idx"
  ON "Chat"("userId", "title", "deletedAt");

CREATE INDEX IF NOT EXISTS "Message_chatId_deletedAt_timestamp_idx"
  ON "Message"("chatId", "deletedAt", "timestamp");

CREATE INDEX IF NOT EXISTS "Message_userId_deletedAt_idx"
  ON "Message"("userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Analysis_userId_deletedAt_status_idx"
  ON "Analysis"("userId", "deletedAt", "status");

CREATE INDEX IF NOT EXISTS "Analysis_chatId_userId_deletedAt_idx"
  ON "Analysis"("chatId", "userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "File_userId_deletedAt_idx"
  ON "File"("userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "File_chatId_userId_deletedAt_idx"
  ON "File"("chatId", "userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "UserSession_userId_deletedAt_lastActivityAt_idx"
  ON "UserSession"("userId", "deletedAt", "lastActivityAt");

CREATE INDEX IF NOT EXISTS "UserDevice_userId_deletedAt_lastLoginAt_idx"
  ON "UserDevice"("userId", "deletedAt", "lastLoginAt");
