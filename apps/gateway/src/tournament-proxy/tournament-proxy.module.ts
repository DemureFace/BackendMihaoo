import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { INTERNAL_HTTP_TIMEOUT_MS, JwtStrategy } from 'common/common';
import { TournamentProxyController } from './tournament-proxy.controller';
import { TournamentTemplateProxyController } from './tournament-template-proxy.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: INTERNAL_HTTP_TIMEOUT_MS }),
    PassportModule,
  ],
  controllers: [TournamentProxyController, TournamentTemplateProxyController],
  providers: [JwtStrategy],
})
export class TournamentProxyModule {}
