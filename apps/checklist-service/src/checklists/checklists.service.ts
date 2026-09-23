import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

// class-validator DTOs are plain-enough at runtime to be valid JSON, but
// their nominal class type doesn't structurally satisfy Prisma's
// InputJsonValue (which wants a bare index signature) — this cast is the
// standard escape hatch, not a sign the data itself is untyped.
function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.checklist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const checklist = await this.prisma.checklist.findUnique({ where: { id } });
    if (!checklist) {
      throw new NotFoundException(`Checklist ${id} not found`);
    }
    return checklist;
  }

  create(dto: CreateChecklistDto) {
    return this.prisma.checklist.create({
      data: { title: dto.title, items: asJson(dto.items) },
    });
  }

  async update(id: number, dto: UpdateChecklistDto) {
    await this.findOne(id);
    return this.prisma.checklist.update({
      where: { id },
      data: { ...dto, items: dto.items ? asJson(dto.items) : undefined },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.checklist.delete({ where: { id } });
  }

  // The checklist's own item list is copied in as `itemsSnapshot` at
  // completion time, so a later edit to Checklist.items never changes how
  // an already-submitted completion reads.
  async submit(checklistId: number, dto: SubmitChecklistDto, userId: string) {
    const checklist = await this.findOne(checklistId);
    return this.prisma.checklistCompletion.create({
      data: {
        checklistId,
        itemsSnapshot: asJson(checklist.items),
        userId,
        answers: asJson(dto.answers),
      },
    });
  }

  findAllCompletions() {
    return this.prisma.checklistCompletion.findMany({
      orderBy: { completedAt: 'desc' },
    });
  }

  async findCompletion(id: number) {
    const completion = await this.prisma.checklistCompletion.findUnique({
      where: { id },
    });
    if (!completion) {
      throw new NotFoundException(`Checklist completion ${id} not found`);
    }
    return completion;
  }
}
