import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';

@Injectable()
export class TournamentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tournament.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }
    return tournament;
  }

  create(dto: CreateTournamentDto, ownerId: string) {
    return this.prisma.tournament.create({ data: { ...dto, ownerId } });
  }

  async update(
    id: string,
    dto: UpdateTournamentDto,
    requesterId: string,
    isAdmin: boolean,
  ) {
    const tournament = await this.findOne(id);
    if (tournament.ownerId !== requesterId && !isAdmin) {
      throw new ForbiddenException('You do not own this tournament');
    }
    return this.prisma.tournament.update({ where: { id }, data: dto });
  }

  async remove(id: string, requesterId: string, isAdmin: boolean) {
    const tournament = await this.findOne(id);
    if (tournament.ownerId !== requesterId && !isAdmin) {
      throw new ForbiddenException('You do not own this tournament');
    }
    await this.prisma.tournament.delete({ where: { id } });
  }
}
