import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sprint.findMany({ orderBy: { startDate: 'desc' } });
  }

  async findOne(id: number) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      throw new NotFoundException(`Sprint ${id} not found`);
    }
    return sprint;
  }

  create(dto: CreateSprintDto) {
    return this.prisma.sprint.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async update(id: number, dto: UpdateSprintDto) {
    await this.findOne(id);
    return this.prisma.sprint.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.sprint.delete({ where: { id } });
  }

  // A task never stores its sprint — this resolves it on demand from
  // whichever Sprint's range contains the given report date.
  findForDate(date: Date) {
    return this.prisma.sprint.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    });
  }
}
