import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

// No onModuleInit()/$connect() here on purpose: Prisma connects lazily on the
// first query, so app boot doesn't require Postgres to be reachable. Only
// code that actually queries the DB (the /tournaments CRUD routes) needs it up.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
