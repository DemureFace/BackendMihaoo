-- AlterTable
-- Nullable soft-delete marker for a single branded row. Null = active.
-- Deleting a row only ever sets this column — nothing else is touched, so
-- restoring (clearing it back to null) always returns the row exactly as
-- it was, comments and progress included.
ALTER TABLE "TaskBrand" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TaskBrand_deletedAt_idx" ON "TaskBrand"("deletedAt");
