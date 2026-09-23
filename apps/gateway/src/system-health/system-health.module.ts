import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SystemHealthController } from './system-health.controller';

@Module({
  imports: [HttpModule],
  controllers: [SystemHealthController],
})
export class SystemHealthModule {}
