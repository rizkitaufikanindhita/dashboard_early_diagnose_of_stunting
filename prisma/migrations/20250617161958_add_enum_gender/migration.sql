/*
  Warnings:

  - Added the required column `gender` to the `Toddler` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "Toddler" DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL;
