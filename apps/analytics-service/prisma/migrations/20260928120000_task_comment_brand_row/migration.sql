-- AlterTable
-- Nullable on purpose: existing comments stay null (marked shared/legacy
-- history on the whole TaskGroup) rather than being guessed onto one
-- sibling TaskBrand row. Every new comment going forward sets this.
ALTER TABLE "TaskComment" ADD COLUMN     "taskBrandId" INTEGER;

-- CreateIndex
CREATE INDEX "TaskComment_taskBrandId_idx" ON "TaskComment"("taskBrandId");

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskBrandId_fkey" FOREIGN KEY ("taskBrandId") REFERENCES "TaskBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
