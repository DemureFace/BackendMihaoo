import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Brand, TaskStatus } from '../generated/prisma';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskBrandDto } from './dto/update-task-brand.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';

const taskBrandInclude = {
  taskGroup: true,
  executor: true,
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // One form submission fans out into one TaskBrand row per selected brand,
  // all sharing the same TaskGroup — this is what lets the Analytics table
  // filter/report per brand while the form only fills shared fields in once.
  async createTaskGroup(dto: CreateTaskGroupDto) {
    const brands = Array.from(new Set(dto.brands));

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

      await Promise.all(
        brands.map((brand) =>
          tx.taskBrand.create({
            data: {
              taskGroupId: taskGroup.id,
              brand,
              executorId: executorFor(brand),
              storyPoints: dto.storyPointsPerBrand,
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
  // "№" row in your table), each carrying its parent TaskGroup's shared fields.
  listTaskBrands(query: QueryTasksDto) {
    return this.prisma.taskBrand.findMany({
      where: {
        executorId: query.executorId,
        brand: query.brand,
        status: query.status,
        taskGroup: {
          requestedById: query.requestedById,
          platform: query.platform,
          taskType: query.taskType,
          reportDate: {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(query.to) : undefined,
          },
          OR: query.search
            ? [
                { title: { contains: query.search, mode: 'insensitive' } },
                { jiraKey: { contains: query.search, mode: 'insensitive' } },
              ]
            : undefined,
        },
      },
      include: taskBrandInclude,
      orderBy: { taskGroup: { reportDate: 'desc' } },
      skip: query.skip,
      take: query.take ?? 50,
    });
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
  // every sibling brand-row and the shared comment thread.
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

  async updateTaskBrand(taskBrandId: number, dto: UpdateTaskBrandDto) {
    const existing = await this.findOne(taskBrandId);

    // closedAt tracks the Done transition on this row specifically — set
    // the moment status flips to DONE, cleared if it's reopened.
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

  // "Видалити" in the detail modal removes the whole task, not just the
  // brand row it was opened from — cascades to every sibling TaskBrand and
  // the comment thread via the schema's onDelete: Cascade.
  async removeGroup(taskBrandId: number) {
    const taskBrand = await this.findOne(taskBrandId);
    await this.prisma.taskGroup.delete({
      where: { id: taskBrand.taskGroupId },
    });
  }

  // "Створити схожу" — a prefill payload for the create form, not a
  // persisted task.
  async getDuplicateTemplate(taskBrandId: number) {
    const taskGroup = await this.getGroupDetail(taskBrandId);
    return {
      title: taskGroup.title,
      description: taskGroup.description,
      platform: taskGroup.platform,
      taskType: taskGroup.taskType,
      requestedById: taskGroup.requestedById,
      jiraKey: taskGroup.jiraKey,
      brands: taskGroup.brands.map((b) => b.brand),
    };
  }

  async addComment(taskGroupId: number, dto: AddCommentDto) {
    await this.prisma.taskGroup.findUniqueOrThrow({
      where: { id: taskGroupId },
    });
    return this.prisma.taskComment.create({
      data: { taskGroupId, authorId: dto.authorId, body: dto.body },
      include: { author: true },
    });
  }
}
