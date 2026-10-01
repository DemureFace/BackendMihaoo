-- CreateTable
-- Append-only work log, separate from TaskBrand.storyPoints (the overall
-- estimate) and TaskBrand.closedAt (completion date). A task can carry SP
-- contributions dated across several periods.
CREATE TABLE "TaskBrandProgress" (
    "id" SERIAL NOT NULL,
    "taskBrandId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "storyPoints" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskBrandProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskBrandProgress_taskBrandId_idx" ON "TaskBrandProgress"("taskBrandId");

-- CreateIndex
CREATE INDEX "TaskBrandProgress_date_idx" ON "TaskBrandProgress"("date");

-- AddForeignKey
ALTER TABLE "TaskBrandProgress" ADD CONSTRAINT "TaskBrandProgress_taskBrandId_fkey" FOREIGN KEY ("taskBrandId") REFERENCES "TaskBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
