import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowUpstreamError } from '../http-client.util';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ImportTeamMemberDto } from './dto/import-team-member.dto';

// "vladyslav.ko" -> "Vladyslav Ko" — just a starting point; the caller can
// always override it via ImportTeamMemberDto.displayName.
function deriveDisplayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

@Injectable()
export class TeamMembersService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl =
      this.configService.getOrThrow<string>('AUTH_SERVICE_URL');
  }

  findAll(activeOnly: boolean) {
    return this.prisma.teamMember.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { displayName: 'asc' },
    });
  }

  async findOne(id: number) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Team member ${id} not found`);
    }
    return member;
  }

  create(dto: CreateTeamMemberDto) {
    return this.prisma.teamMember.create({ data: dto });
  }

  async update(id: number, dto: UpdateTeamMemberDto) {
    await this.findOne(id);
    return this.prisma.teamMember.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.teamMember.delete({ where: { id } });
  }

  // Pattern #1 — API composition. Live, uncached, admin-only call to
  // auth-service; nothing here is persisted. Backs the "add colleague"
  // autocomplete. Forwards the caller's own JWT, since auth-service's
  // GET /users is gated by RolesGuard on the *caller's* roles, not a
  // separate service-to-service credential.
  async searchAuthUsers(search: string | undefined, authorization: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/users`, {
          params: search ? { search } : undefined,
          headers: { authorization },
        }),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  // Pattern #2 — snapshot on write. Turns one auth-service search result
  // into a local TeamMember row; every read after this (task lists,
  // executor pickers) hits only this table, never auth-service again.
  // Idempotent by authUserId, so re-importing the same person is a no-op.
  async importFromAuth(dto: ImportTeamMemberDto) {
    const existing = await this.prisma.teamMember.findUnique({
      where: { authUserId: dto.authUserId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.teamMember.create({
      data: {
        authUserId: dto.authUserId,
        email: dto.email,
        displayName: dto.displayName?.trim() || deriveDisplayName(dto.email),
      },
    });
  }
}
