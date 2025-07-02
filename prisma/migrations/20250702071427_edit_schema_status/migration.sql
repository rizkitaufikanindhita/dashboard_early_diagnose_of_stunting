/*
  Warnings:

  - You are about to drop the column `age` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Status` table. All the data in the column will be lost.
  - Added the required column `encrypted_payload` to the `Status` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Status" DROP COLUMN "age",
DROP COLUMN "height",
DROP COLUMN "recommendation",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "encrypted_payload" TEXT NOT NULL;
