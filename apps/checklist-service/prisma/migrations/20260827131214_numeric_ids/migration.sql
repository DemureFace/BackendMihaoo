/*
  Warnings:

  - The primary key for the `Checklist` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Checklist` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ChecklistCompletion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `ChecklistCompletion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `checklistId` on the `ChecklistCompletion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ChecklistCompletion" DROP CONSTRAINT "ChecklistCompletion_checklistId_fkey";

-- AlterTable
ALTER TABLE "Checklist" DROP CONSTRAINT "Checklist_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ChecklistCompletion" DROP CONSTRAINT "ChecklistCompletion_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "checklistId",
ADD COLUMN     "checklistId" INTEGER NOT NULL,
ADD CONSTRAINT "ChecklistCompletion_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "ChecklistCompletion_checklistId_idx" ON "ChecklistCompletion"("checklistId");

-- AddForeignKey
ALTER TABLE "ChecklistCompletion" ADD CONSTRAINT "ChecklistCompletion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
