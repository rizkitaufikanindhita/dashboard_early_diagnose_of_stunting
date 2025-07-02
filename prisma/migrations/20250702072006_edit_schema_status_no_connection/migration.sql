/*
  Warnings:

  - You are about to drop the column `toddlerId` on the `Status` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Status" DROP CONSTRAINT "Status_toddlerId_fkey";

-- AlterTable
ALTER TABLE "Status" DROP COLUMN "toddlerId";
