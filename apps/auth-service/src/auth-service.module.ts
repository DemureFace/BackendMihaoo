import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule.forRoot({
      serviceName: 'auth-service',
      databaseCheck: {
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => () => prisma.$queryRaw`SELECT 1`,
      },
    }),
  ],
})
export class AuthServiceModule {}
