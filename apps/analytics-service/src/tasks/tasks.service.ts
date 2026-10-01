import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Brand, Prisma, TaskStatus } from '../generated/prisma';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskBrandDto } from './dto/update-task-brand.dto';
import { UpdateTaskGroupDto } from './dto/update-task-group.dto';
import { QueryTasksDto, TaskSortField } from './dto/query-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AddProgressEntryDto } from './dto/add-progress-entry.dto';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { csvEscape } from './csv.util';
import { deriveDisplayName } from '../common/derive-display-name.util';
import type { JwtPayload } from 'common/common';

const taskBrandInclude = {
  taskGroup: true,
  executor: true,
  progressEntries: { orderBy: { date: 'asc' as const } },
} as const;

const taskBrandExportInclude = {
  taskGroup: { include: { requestedBy: true } },
  executor: true,
} as const;

// A date-only value (e.g. "2026-09-01") means "through the end of that
// day" for an inclusive upper bound — a full ISO datetime is already
// precise and is used as-is.
function endOfDayIfDateOnly(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T23:59:59.999Z`)
    : new Date(value);
}

function buildWhere(query: Omit<QueryTasksDto, 'skip' | 'take'>): Prisma.TaskBrandWhereInput {
  return {
    // Soft-deleted rows never appear in the list or the export — this is
    // the one shared where-builder both go through, so there's nowhere
    // else that needs the same check.
    deletedAt: null,
    executorId: query.executorId?.length ? { in: query.executorId } : undefined,
    brand: query.brand?.length ? { in: query.brand } : undefined,
    status: query.status?.length ? { in: query.status } : undefined,
    taskGroup: {
      requestedById: query.requestedById?.length
        ? { in: query.requestedById }
        : undefined,
      platform: query.platform?.length ? { in: query.platform } : undefined,
      taskType: query.taskType?.length ? { in: query.taskType } : undefined,
      reportDate: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? endOfDayIfDateOnly(query.to) : undefined,
      },
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { jiraKey: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    },
  };
}

// Whatever the caller sorts by, an `id` tiebreaker is appended so rows with
// equal sort keys always come back in the same order — without it, pages
// can reshuffle duplicates or skip/repeat rows across requests.
function buildOrderBy(
  sortBy: TaskSortField = TaskSortField.REPORT_DATE,
  sortOrder: 'asc' | 'desc' = 'desc',
): Prisma.TaskBrandOrderByWithRelationInput[] {
  const primary: Prisma.TaskBrandOrderByWithRelationInput =
    sortBy === TaskSortField.STORY_POINTS
      ? { storyPoints: sortOrder }
      : sortBy === TaskSortField.STATUS
        ? { status: sortOrder }
        : { taskGroup: { [sortBy]: sortOrder } };
  return [primary, { id: sortOrder }];
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  // One form submission fans out into one TaskBrand row per selected brand,
  // all sharing the same TaskGroup — this is what lets the Analytics table
  // filter/report per brand while the form only fills shared fields in once.
  async createTaskGroup(dto: CreateTaskGroupDto) {
    const brands = Array.from(new Set(dto.brands));

    this.referenceData.assertValidBrandsForPlatform(dto.platform, brands);

    if (dto.differentExecutorsPerBrand) {
      const covered = new Set(dto.brandExecutors?.map((be) => be.brand));
      const missing = brands.filter((b) => !covered.has(b));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Missing executor for brand(s): ${missing.join(', ')}`,
        );
      }
    } else if (dto.executorId === undefined) {
      throw new BadRequestException(
        'executorId is required unless differentExecutorsPerBrand is set',
      );
    }

    const status = dto.status ?? TaskStatus.IN_PROGRESS;
    if (status === TaskStatus.DONE && !dto.closedAt) {
      throw new BadRequestException(
        'closedAt is required when creating a task with status DONE',
      );
    }
    if (status !== TaskStatus.DONE && dto.closedAt) {
      throw new BadRequestException(
        'closedAt may only be set when status is DONE',
      );
    }
    const closedAt = dto.closedAt ? new Date(dto.closedAt) : undefined;

    const executorFor = (brand: Brand) =>
      dto.differentExecutorsPerBrand
        ? dto.brandExecutors!.find((be) => be.brand === brand)!.executorId
        : dto.executorId!;

    return this.prisma.$transaction(async (tx) => {
      const taskGroup = await tx.taskGroup.create({
        data: {
          title: dto.title?.trim() || 'Без назви',
          description: dto.description,
          platform: dto.platform,
          taskType: dto.taskType,
          requestedById: dto.requestedById,
          jiraKey: dto.jiraKey,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          reportDate: new Date(dto.reportDate),
        },
      });

      // Atomic: every brand row is created in this same transaction, so a
      // mid-way failure never leaves a task half-created.
      await Promise.all(
        brands.map((brand) =>
          tx.taskBrand.create({
            data: {
              taskGroupId: taskGroup.id,
              brand,
              executorId: executorFor(brand),
              storyPoints: dto.storyPointsPerBrand,
              status,
              closedAt,
            },
          }),
        ),
      );

      return tx.taskGroup.findUniqueOrThrow({
        where: { id: taskGroup.id },
        include: { brands: { include: { executor: true } } },
      });
    });
  }

  // The Analytics page's main query — flattened TaskBrand rows (one per
  // "№" row in your table), each carrying its parent TaskGroup's shared
  // fields. Multiple values within one filter (e.g. brand=JC,MW) OR
  // together via Prisma's `in`; different filters AND together since
  // they're all conditions on the same `where` object. An omitted/empty
  // filter matches everything (see buildWhere).
  async listTaskBrands(query: QueryTasksDto) {
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder ?? 'desc');

    const [data, total] = await Promise.all([
      this.prisma.taskBrand.findMany({
        where,
        include: taskBrandInclude,
        orderBy,
        skip: query.skip,
        take: query.take ?? 50,
      }),
      this.prisma.taskBrand.count({ where }),
    ]);

    return { data, total };
  }

  // CSV export — the full filtered set (same filters/sort as the list, no
  // pagination), not just whatever page the Task List happens to be on.
  async exportTasksCsv(
    query: Omit<QueryTasksDto, 'skip' | 'take'>,
  ): Promise<string> {
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder ?? 'desc');

    const rows = await this.prisma.taskBrand.findMany({
      where,
      include: taskBrandExportInclude,
      orderBy,
    });

    const header = [
      'id',
      'title',
      'description',
      'platform',
      'taskType',
      'brand',
      'requester',
      'executor',
      'storyPoints',
      'status',
      'jiraKey',
      'reportDate',
      'dueDate',
      'closedAt',
    ];

    const lines = rows.map((row) =>
      [
        row.id,
        row.taskGroup.title,
        row.taskGroup.description,
        row.taskGroup.platform,
        row.taskGroup.taskType,
        row.brand,
        row.taskGroup.requestedBy.displayName,
        row.executor.displayName,
        row.storyPoints,
        row.status,
        row.taskGroup.jiraKey ?? '',
        row.taskGroup.reportDate.toISOString(),
        row.taskGroup.dueDate?.toISOString() ?? '',
        row.closedAt?.toISOString() ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );

    return [header.join(','), ...lines].join('\r\n');
  }

  async findOne(taskBrandId: number) {
    const taskBrand = await this.prisma.taskBrand.findUnique({
      where: { id: taskBrandId },
      include: taskBrandInclude,
    });
    if (!taskBrand) {
      throw new NotFoundException(`Task ${taskBrandId} not found`);
    }
    return taskBrand;
  }

  // The detail modal: given any one brand-row's id, load its group plus
  // every sibling brand-row and the shared comment thread. Deliberately
  // does NOT filter out soft-deleted siblings — this is the only place a
  // deleted row is still reachable (it's excluded from the list, so this
  // is where a "JC (deleted)" row next to an active "MW" gets seen and
  // restored from).
  async getGroupDetail(taskBrandId: number) {
    const taskBrand = await this.findOne(taskBrandId);
    return this.prisma.taskGroup.findUniqueOrThrow({
      where: { id: taskBrand.taskGroupId },
      include: {
        requestedBy: true,
        brands: { include: { executor: true }, orderBy: { brand: 'asc' } },
        comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  // Editing the estimate/status/executor here never touches
  // progressEntries — the credited-progress journal only ever grows via
  // addProgressEntry, so ordinary edits (including a status flip) can
  // never erase or backfill history there.
  async updateTaskBrand(taskBrandId: number, dto: UpdateTaskBrandDto) {
    const existing = await this.findOne(taskBrandId);

    // closedAt tracks the Done transition on this row specifically — set
    // the moment status flips to DONE, cleared if it's reopened. This is
    // the *completion date*, independent of the SP journal: flipping
    // status here never credits (or re-credits) any storyPoints — see
    // addProgressEntry, the only place that happens.
    const closedAt =
      dto.status === undefined || dto.status === existing.status
        ? undefined
        : dto.status === TaskStatus.DONE
          ? new Date()
          : null;

    return this.prisma.taskBrand.update({
      where: { id: taskBrandId },
      data: {
        executorId: dto.executorId,
        storyPoints: dto.storyPoints,
        status: dto.status,
        closedAt,
      },
      include: taskBrandInclude,
    });
  }

  // Editing the fields that live on TaskGroup — title, description,
  // taskType, requester, Jira key, due date — is a deliberately separate
  // operation from updateTaskBrand. Those fields are shared by every
  // sibling brand row, so touching them here is the "explicit group
  // action" the model requires: PATCH /tasks/:id (updateTaskBrand) never
  // reaches into TaskGroup, and this never reaches into a TaskBrand, so
  // editing one row can't accidentally change its siblings, and editing
  // shared fields can't accidentally change one row's own status/SP/executor.
  async updateTaskGroup(taskBrandId: number, dto: UpdateTaskGroupDto) {
    const taskBrand = await this.findOne(taskBrandId);
    await this.prisma.taskGroup.update({
      where: { id: taskBrand.taskGroupId },
      data: {
        title: dto.title,
        description: dto.description,
        taskType: dto.taskType,
        requestedById: dto.requestedById,
        jiraKey: dto.jiraKey,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return this.getGroupDetail(taskBrandId);
  }

  // "Видалити" in the detail modal now soft-deletes just this one
  // branded row — its siblings (and their comments) are untouched, since
  // this only sets deletedAt rather than deleting the TaskGroup.
  // Idempotent: calling it again on an already-deleted row is a no-op
  // that returns the row as-is, preserving the original deletedAt.
  async softDeleteTaskBrand(taskBrandId: number) {
    const existing = await this.findOne(taskBrandId);
    if (existing.deletedAt) {
      return existing;
    }
    return this.prisma.taskBrand.update({
      where: { id: taskBrandId },
      data: { deletedAt: new Date() },
      include: taskBrandInclude,
    });
  }

  // Undoes softDeleteTaskBrand — clears deletedAt, the only field
  // deletion ever touched, so the row's comments, progress journal, and
  // state (status/storyPoints/closedAt) come back exactly as they were.
  // Idempotent: restoring an already-active row is a no-op.
  async restoreTaskBrand(taskBrandId: number) {
    const existing = await this.findOne(taskBrandId);
    if (!existing.deletedAt) {
      return existing;
    }
    return this.prisma.taskBrand.update({
      where: { id: taskBrandId },
      data: { deletedAt: null },
      include: taskBrandInclude,
    });
  }

  // "Створити схожу" — a prefill payload for the create form, never a
  // persisted task itself: this is a plain GET with no side effects, so
  // nothing is created until the user actually submits that prefilled
  // form as a real POST /tasks. Deliberately doesn't carry over
  // reportDate, storyPoints, executor, or status/closedAt — a "similar"
  // task is a new one, not a resurrection of the old row's progress or
  // completion state.
  async getDuplicateTemplate(taskBrandId: number) {
    const taskGroup = await this.getGroupDetail(taskBrandId);
    return {
      title: taskGroup.title,
      description: taskGroup.description,
      platform: taskGroup.platform,
      taskType: taskGroup.taskType,
      requestedById: taskGroup.requestedById,
      jiraKey: taskGroup.jiraKey,
      dueDate: taskGroup.dueDate,
      // getGroupDetail deliberately includes soft-deleted siblings (so
      // they're visible for restore), but a brand someone explicitly
      // removed from the original task shouldn't reappear as a prefilled
      // suggestion on its duplicate.
      brands: taskGroup.brands
        .filter((b) => !b.deletedAt)
        .map((b) => b.brand),
    };
  }

  // taskBrandId, not taskGroupId — comments now belong to the specific
  // branded row they were written against, matching how findOne/
  // updateTaskBrand already treat this same :id. authorId always comes
  // from the caller's own JWT (see resolveAuthor), never from the request
  // body, so a client can't attribute a comment to someone else.
  async addComment(
    taskBrandId: number,
    dto: AddCommentDto,
    user: JwtPayload,
  ) {
    const taskBrand = await this.findOne(taskBrandId);
    const author = await this.resolveAuthor(user);

    return this.prisma.taskComment.create({
      data: {
        taskGroupId: taskBrand.taskGroupId,
        taskBrandId: taskBrand.id,
        authorId: author.id,
        body: dto.body,
      },
      include: { author: true },
    });
  }

  // Appends one dated SP contribution to this row's journal. Purely an
  // insert — there's no update/delete for an entry, so nothing here can
  // ever erase prior history, and nothing here touches status/closedAt:
  // crediting progress and marking a row DONE are two independent actions
  // (see updateTaskBrand). A task can accumulate entries across as many
  // different dates/periods as it needs.
  async addProgressEntry(taskBrandId: number, dto: AddProgressEntryDto) {
    const taskBrand = await this.findOne(taskBrandId);
    return this.prisma.taskBrandProgress.create({
      data: {
        taskBrandId: taskBrand.id,
        date: new Date(dto.date),
        storyPoints: dto.storyPoints,
        note: dto.note,
      },
    });
  }

  // Find-or-create the TeamMember behind the authenticated caller: match
  // by authUserId first, fall back to email (backfilling authUserId onto
  // that row so future lookups hit the fast path), and only create a new
  // roster entry if neither matches — same shape as the "import from auth"
  // flow in TeamMembersService, just triggered by commenting instead of an
  // explicit admin action.
  private async resolveAuthor(user: JwtPayload) {
    const byAuthId = await this.prisma.teamMember.findUnique({
      where: { authUserId: user.sub },
    });
    if (byAuthId) {
      return byAuthId;
    }

    const byEmail = await this.prisma.teamMember.findFirst({
      where: { email: user.email },
    });
    if (byEmail) {
      return this.prisma.teamMember.update({
        where: { id: byEmail.id },
        data: { authUserId: user.sub },
      });
    }

    return this.prisma.teamMember.create({
      data: {
        authUserId: user.sub,
        email: user.email,
        displayName: deriveDisplayName(user.email),
      },
    });
  }
}
