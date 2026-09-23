import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ChecklistsModule } from './checklists/checklists.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ChecklistsModule,
    HealthModule.forRoot({
      serviceName: 'checklist-service',
      databaseCheck: {
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => () => prisma.$queryRaw`SELECT 1`,
      },
    }),
  ],
})
export class ChecklistServiceModule {}
