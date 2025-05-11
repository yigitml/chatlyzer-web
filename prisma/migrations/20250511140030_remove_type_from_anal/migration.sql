/*
  Warnings:

  - You are about to drop the column `type` on the `AnalyticsResult` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalyticsResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AnalyticsResult_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnalyticsResult" ("chatId", "createdAt", "deletedAt", "id", "result", "updatedAt", "userId") SELECT "chatId", "createdAt", "deletedAt", "id", "result", "updatedAt", "userId" FROM "AnalyticsResult";
DROP TABLE "AnalyticsResult";
ALTER TABLE "new_AnalyticsResult" RENAME TO "AnalyticsResult";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
