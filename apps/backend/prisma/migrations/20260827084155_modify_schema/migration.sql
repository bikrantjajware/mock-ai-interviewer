/*
  Warnings:

  - You are about to drop the column `status` on the `Message` table. All the data in the column will be lost.
  - Added the required column `status` to the `Interview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "status" "InterviewStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "status";
