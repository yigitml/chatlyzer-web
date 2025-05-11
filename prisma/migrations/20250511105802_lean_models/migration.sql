/*
  Warnings:

  - You are about to drop the `Analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `deletedAt` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `senderName` on the `Message` table. All the data in the column will be lost.
  - Added the required column `sender` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Contact_userId_identifier_source_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Analysis";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Contact";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AnalyticsResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "AnalyticsResult_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "participants" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Chat" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "content", "createdAt", "id", "metadata", "timestamp", "updatedAt") SELECT "chatId", "content", "createdAt", "id", "metadata", "timestamp", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
