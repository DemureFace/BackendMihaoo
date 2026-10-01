// Baseline seed for a freshly migrated database (staging, or a fresh local
// database). Idempotent — upserts the team member by email, only creates a
// Sprint if none exist yet — so re-running it is safe.
//
// Not wired into any migrate/deploy step; run explicitly
// (`npm run prisma:seed:analytics`) against whichever
// `ANALYTICS_DATABASE_URL` is currently in the environment. Never point
// that env var at production when running this.
//
// `authUserId` is deliberately left unset — link this row to a real
// auth-service account later via the existing
// `POST /team-members/import` flow, rather than guessing a UUID here.
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const SEED_MEMBER_EMAIL =
  process.env.SEED_TEAM_MEMBER_EMAIL ?? 'admin@staging.mihaoo.local';
const SEED_MEMBER_NAME = process.env.SEED_TEAM_MEMBER_NAME ?? 'Staging Admin';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SPRINT_LENGTH_DAYS = 14;

async function main() {
  // `email` has no unique constraint on TeamMember (see schema.prisma), so
  // this is a manual find-then-create instead of `upsert`.
  const existingMember = await prisma.teamMember.findFirst({
    where: { email: SEED_MEMBER_EMAIL },
  });
  const member =
    existingMember ??
    (await prisma.teamMember.create({
      data: {
        displayName: SEED_MEMBER_NAME,
        email: SEED_MEMBER_EMAIL,
        isActive: true,
      },
    }));
  console.log(`Seeded team member: ${member.displayName} (id: ${member.id})`);

  const existingSprint = await prisma.sprint.findFirst();
  if (existingSprint) {
    console.log(`Sprint already exists (${existingSprint.name}) — skipping.`);
  } else {
    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + SPRINT_LENGTH_DAYS * MS_PER_DAY,
    );
    const sprint = await prisma.sprint.create({
      data: { name: 'Sprint 1 (seed)', startDate, endDate },
    });
    console.log(
      `Seeded sprint: ${sprint.name} (${sprint.startDate.toISOString()} – ${sprint.endDate.toISOString()})`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
