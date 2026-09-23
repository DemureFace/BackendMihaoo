import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { BannerExportModule } from './banner-export/banner-export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BannerExportModule,
    HealthModule.forRoot({ serviceName: 'banner-export-service' }),
  ],
})
export class BannerExportServiceModule {}
