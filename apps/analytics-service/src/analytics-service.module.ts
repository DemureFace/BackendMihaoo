import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { TeamMembersModule } from './team-members/team-members.module';
import { SprintsModule } from './sprints/sprints.module';
import { TasksModule } from './tasks/tasks.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TeamMembersModule,
    SprintsModule,
    TasksModule,
    ReferenceDataModule,
    HealthModule.forRoot({
      serviceName: 'analytics-service',
      databaseCheck: {
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => () => prisma.$queryRaw`SELECT 1`,
      },
    }),
  ],
})
export class AnalyticsServiceModule {}
