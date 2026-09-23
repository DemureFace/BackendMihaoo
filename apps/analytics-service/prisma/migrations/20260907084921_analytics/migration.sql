-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SS', 'P8', 'TL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SLIDER', 'LEGAL', 'AFFILIATE_LANDING', 'NETWORK_TOURNAMENT', 'TRANSLATION_KEY');

-- CreateEnum
CREATE TYPE "Brand" AS ENUM ('JC', 'MW', 'SR', 'SG', 'BH', 'WR', 'RO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Sprint" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "authUserId" TEXT,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Без назви',
    "description" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "jiraKey" TEXT,
    "dueDate" TIMESTAMP(3),
    "reportDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskBrand" (
    "id" SERIAL NOT NULL,
    "taskGroupId" INTEGER NOT NULL,
    "brand" "Brand" NOT NULL,
    "executorId" INTEGER NOT NULL,
    "storyPoints" DOUBLE PRECISION NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" SERIAL NOT NULL,
    "taskGroupId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_authUserId_key" ON "TeamMember"("authUserId");

-- CreateIndex
CREATE INDEX "TaskGroup_reportDate_idx" ON "TaskGroup"("reportDate");

-- CreateIndex
CREATE INDEX "TaskGroup_requestedById_idx" ON "TaskGroup"("requestedById");

-- CreateIndex
CREATE INDEX "TaskBrand_executorId_idx" ON "TaskBrand"("executorId");

-- CreateIndex
CREATE INDEX "TaskBrand_status_idx" ON "TaskBrand"("status");

-- CreateIndex
CREATE INDEX "TaskBrand_brand_idx" ON "TaskBrand"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "TaskBrand_taskGroupId_brand_key" ON "TaskBrand"("taskGroupId", "brand");

-- CreateIndex
CREATE INDEX "TaskComment_taskGroupId_idx" ON "TaskComment"("taskGroupId");

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskBrand" ADD CONSTRAINT "TaskBrand_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskBrand" ADD CONSTRAINT "TaskBrand_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
