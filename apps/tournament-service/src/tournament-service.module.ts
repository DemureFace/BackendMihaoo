import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { TournamentModule } from './tournament/tournament.module';
import { TournamentTemplateModule } from './tournament-template/tournament-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TournamentModule,
    TournamentTemplateModule,
    HealthModule.forRoot({
      serviceName: 'tournament-service',
      databaseCheck: {
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => () => prisma.$queryRaw`SELECT 1`,
      },
    }),
  ],
})
export class TournamentServiceModule {}
