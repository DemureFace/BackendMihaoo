import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { INTERNAL_HTTP_TIMEOUT_MS, JwtStrategy } from 'common/common';
import { BonusTemplateProxyController } from './bonus-template-proxy.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: INTERNAL_HTTP_TIMEOUT_MS }),
    PassportModule,
  ],
  controllers: [BonusTemplateProxyController],
  providers: [JwtStrategy],
})
export class BonusProxyModule {}
