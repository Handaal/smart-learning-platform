/*
  Warnings:

  - You are about to alter the column `participant_id` on the `learner` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterventionType" ADD VALUE 'pause_and_check';
ALTER TYPE "InterventionType" ADD VALUE 'reframe';

-- AlterTable
ALTER TABLE "learner" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(20);
