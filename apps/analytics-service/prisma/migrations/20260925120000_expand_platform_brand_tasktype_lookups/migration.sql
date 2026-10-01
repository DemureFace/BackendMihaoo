-- AlterEnum
-- Pre-existing drift fix: schema.prisma already mapped Platform.P8 to the
-- literal "8P" (@map), but the enum in the database still stored the
-- literal "P8" from the original migration — no row currently uses this
-- platform, but RENAME VALUE keeps it safe either way.
ALTER TYPE "Platform" RENAME VALUE 'P8' TO '8P';

-- AlterEnum
-- PROMO / PROMO_LANDING were already declared in schema.prisma but never
-- migrated into the database (pre-existing drift, unrelated to this
-- ticket) — added here alongside the new task types this ticket adds.
ALTER TYPE "TaskType" ADD VALUE 'PROMO' AFTER 'TRANSLATION_KEY';
ALTER TYPE "TaskType" ADD VALUE 'PROMO_LANDING' AFTER 'PROMO';
ALTER TYPE "TaskType" ADD VALUE 'NEW_GEO_SETUP' AFTER 'PROMO_LANDING';
ALTER TYPE "TaskType" ADD VALUE 'NEW_BRAND_SETUP' AFTER 'NEW_GEO_SETUP';
ALTER TYPE "TaskType" ADD VALUE 'VIP' AFTER 'NEW_BRAND_SETUP';
ALTER TYPE "TaskType" ADD VALUE 'LOYALTY' AFTER 'VIP';
ALTER TYPE "TaskType" ADD VALUE 'GAME_CATEGORIES' AFTER 'LOYALTY';
ALTER TYPE "TaskType" ADD VALUE 'BUG' AFTER 'GAME_CATEGORIES';
ALTER TYPE "TaskType" ADD VALUE 'OTHER' AFTER 'BUG';

-- AlterEnum
-- New brand codes from the prototype. RO is intentionally left in place
-- (existing rows reference it) but is no longer offered/accepted by the
-- application for new tasks — see ReferenceDataService.
ALTER TYPE "Brand" ADD VALUE 'TS' AFTER 'RO';
ALTER TYPE "Brand" ADD VALUE 'CG' AFTER 'TS';
ALTER TYPE "Brand" ADD VALUE 'WK' AFTER 'CG';
ALTER TYPE "Brand" ADD VALUE 'NS' AFTER 'WK';
ALTER TYPE "Brand" ADD VALUE 'TL' AFTER 'NS';
ALTER TYPE "Brand" ADD VALUE 'HL' AFTER 'TL';
ALTER TYPE "Brand" ADD VALUE 'SRH' AFTER 'HL';
ALTER TYPE "Brand" ADD VALUE 'SA' AFTER 'SRH';
-- RANDOM was already declared in schema.prisma but never migrated into the
-- database (pre-existing drift, unrelated to this ticket).
ALTER TYPE "Brand" ADD VALUE 'RANDOM' AFTER 'SA';
