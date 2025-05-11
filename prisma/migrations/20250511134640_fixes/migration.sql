/*
  Warnings:

  - Made the column `userId` on table `AnalyticsResult` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalyticsResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AnalyticsResult_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnalyticsResult" ("chatId", "createdAt", "deletedAt", "id", "result", "type", "updatedAt", "userId") SELECT "chatId", "createdAt", "deletedAt", "id", "result", "type", "updatedAt", "userId" FROM "AnalyticsResult";
DROP TABLE "AnalyticsResult";
ALTER TABLE "new_AnalyticsResult" RENAME TO "AnalyticsResult";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "content", "createdAt", "deletedAt", "id", "metadata", "sender", "timestamp", "updatedAt") SELECT "chatId", "content", "createdAt", "deletedAt", "id", "metadata", "sender", "timestamp", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
