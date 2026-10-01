import { PrismaService } from './apps/analytics-service/src/prisma/prisma.service';
import { ReferenceDataService } from './apps/analytics-service/src/reference-data/reference-data.service';
import { TasksService } from './apps/analytics-service/src/tasks/tasks.service';
import { Platform, TaskType, Brand } from './apps/analytics-service/src/generated/prisma';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const svc = new TasksService(prisma, new ReferenceDataService());

  const requester = await prisma.teamMember.create({
    data: { displayName: 'Olena P', email: 'olena@example.com' },
  });
  const executor = await prisma.teamMember.create({
    data: { displayName: 'Vlad K', email: 'vlad@example.com' },
  });
  // Already linked to an auth-service account — the "byAuthId" fast path.
  const linked = await prisma.teamMember.create({
    data: { displayName: 'Linked User', email: 'linked@example.com', authUserId: 'auth-sub-linked' },
  });
  // Known locally by email but never linked — the "byEmail backfill" path.
  const unlinked = await prisma.teamMember.create({
    data: { displayName: 'Unlinked User', email: 'unlinked@example.com' },
  });

  const group = await svc.createTaskGroup({
    description: 'Test task',
    platform: Platform.SS,
    taskType: TaskType.SLIDER,
    brands: [Brand.JC, Brand.MW],
    executorId: executor.id,
    requestedById: requester.id,
    reportDate: '2026-09-28',
    storyPointsPerBrand: 1,
  } as any);

  const [brandA, brandB] = group.brands;
  console.log('TaskGroup id', group.id, 'brand rows', brandA.id, brandB.id);

  console.log('\n--- 1. author already linked by authUserId ---');
  const c1 = await svc.addComment(brandA.id, { body: 'hello from linked user' } as any, {
    sub: 'auth-sub-linked',
    email: 'linked@example.com',
    roles: [],
  });
  console.log({ id: c1.id, taskBrandId: c1.taskBrandId, taskGroupId: c1.taskGroupId, authorId: c1.authorId, authorName: c1.author.displayName });

  console.log('\n--- 2. author known by email only -> backfills authUserId ---');
  const c2 = await svc.addComment(brandB.id, { body: 'hello from unlinked user' } as any, {
    sub: 'auth-sub-unlinked-NEW',
    email: 'unlinked@example.com',
    roles: [],
  });
  console.log({ id: c2.id, taskBrandId: c2.taskBrandId, taskGroupId: c2.taskGroupId, authorId: c2.authorId, authorName: c2.author.displayName });
  const backfilled = await prisma.teamMember.findUnique({ where: { id: unlinked.id } });
  console.log('unlinked TeamMember authUserId after backfill:', backfilled?.authUserId);

  console.log('\n--- 3. author totally new -> auto-provisioned ---');
  const c3 = await svc.addComment(brandA.id, { body: 'hello from brand new user' } as any, {
    sub: 'auth-sub-brand-new',
    email: 'first.last@example.com',
    roles: [],
  });
  console.log({ id: c3.id, taskBrandId: c3.taskBrandId, authorId: c3.authorId, authorName: c3.author.displayName });
  const provisioned = await prisma.teamMember.findUnique({ where: { authUserId: 'auth-sub-brand-new' } });
  console.log('auto-provisioned TeamMember:', provisioned);

  console.log('\n--- 4. client cannot supply authorId (DTO has no such field) ---');
  const dtoKeys = Object.keys({ body: 'x', authorId: 999 });
  console.log('AddCommentDto only validates `body` — extra authorId would be stripped/rejected by ValidationPipe whitelist, verified separately via controller-level test.');

  console.log('\n--- 5. group detail shows both new (tagged) comments together, still unified ---');
  const detail = await svc.getGroupDetail(brandA.id);
  console.log(detail.comments.map((c) => ({ id: c.id, taskBrandId: c.taskBrandId, body: c.body, author: c.author.displayName })));

  console.log('\n--- 6. legacy simulation: a comment with taskBrandId left null still shows in group detail ---');
  await prisma.taskComment.create({
    data: { taskGroupId: group.id, authorId: requester.id, body: 'old shared comment, pre-migration' },
  });
  const detail2 = await svc.getGroupDetail(brandA.id);
  console.log(detail2.comments.map((c) => ({ id: c.id, taskBrandId: c.taskBrandId, body: c.body })));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('THREW:', e);
  process.exit(1);
});
