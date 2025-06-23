/*
  Warnings:

  - You are about to drop the column `userId` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `uid` on the `User` table. All the data in the column will be lost.
  - Added the required column `toddlerId` to the `Status` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Status" DROP CONSTRAINT "Status_userId_fkey";

-- DropIndex
DROP INDEX "User_uid_key";

-- AlterTable
ALTER TABLE "Status" DROP COLUMN "userId",
ADD COLUMN     "toddlerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gender",
DROP COLUMN "uid";

-- CreateTable
CREATE TABLE "Toddler" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" INTEGER,

    CONSTRAINT "Toddler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Toddler_uid_key" ON "Toddler"("uid");

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_toddlerId_fkey" FOREIGN KEY ("toddlerId") REFERENCES "Toddler"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
