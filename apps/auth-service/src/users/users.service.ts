import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
  }

  // Backs analytics-service's "add colleague" picker — deliberately minimal
  // (id + email only, capped result set) since it's exposing real accounts.
  search(query?: string) {
    return this.prisma.user.findMany({
      where: query
        ? { email: { contains: query, mode: 'insensitive' } }
        : undefined,
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
      take: 20,
    });
  }

  async create(email: string, hashedPassword: string) {
    const defaultRole = await this.prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' },
    });

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roles: { connect: [{ id: defaultRole.id }] },
      },
      include: { roles: true },
    });
  }
}
