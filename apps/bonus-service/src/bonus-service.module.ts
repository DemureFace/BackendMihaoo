import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { BonusTemplateModule } from './bonus-template/bonus-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BonusTemplateModule,
    HealthModule.forRoot({ serviceName: 'bonus-service' }),
  ],
})
export class BonusServiceModule {}
