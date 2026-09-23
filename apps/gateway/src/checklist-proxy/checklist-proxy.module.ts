import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { INTERNAL_HTTP_TIMEOUT_MS, JwtStrategy } from 'common/common';
import { ChecklistProxyController } from './checklist-proxy.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: INTERNAL_HTTP_TIMEOUT_MS }),
    PassportModule,
  ],
  controllers: [ChecklistProxyController],
  providers: [JwtStrategy],
})
export class ChecklistProxyModule {}
