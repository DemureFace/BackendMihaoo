// Baseline seed for a freshly migrated database (staging, or a fresh local
// database). Idempotent — safe to run more than once, upserts by unique key
// instead of inserting blindly, so re-running it is not the way to "reset"
// data.
//
// This is deliberately NOT wired into `npm run prisma:migrate:*` or any
// deploy step — seeding is an explicit, manual action
// (`npm run prisma:seed:auth`) against whichever `AUTH_DATABASE_URL` is
// currently in the environment. Never point that env var at production
// when running this.
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const SEED_ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL ?? 'admin@staging.mihaoo.local';
const SEED_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? 'change-me-staging-admin';

async function main() {
  const [userRole, adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    }),
  ]);

  const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {},
    create: {
      email: SEED_ADMIN_EMAIL,
      password: hashedPassword,
      roles: { connect: [{ id: userRole.id }, { id: adminRole.id }] },
    },
  });

  console.log(`Seeded roles: ${userRole.name}, ${adminRole.name}`);
  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      `Using default staging password — override with SEED_ADMIN_PASSWORD env var next time.`,
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
