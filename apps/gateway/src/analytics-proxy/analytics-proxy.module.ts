import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { INTERNAL_HTTP_TIMEOUT_MS, JwtStrategy } from 'common/common';
import { TeamMembersProxyController } from './team-members-proxy.controller';
import { SprintsProxyController } from './sprints-proxy.controller';
import { TasksProxyController } from './tasks-proxy.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: INTERNAL_HTTP_TIMEOUT_MS }),
    PassportModule,
  ],
  controllers: [
    TeamMembersProxyController,
    SprintsProxyController,
    TasksProxyController,
  ],
  providers: [JwtStrategy],
})
export class AnalyticsProxyModule {}
