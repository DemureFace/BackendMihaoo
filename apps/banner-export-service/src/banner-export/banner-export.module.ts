import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { BannerExportController } from './banner-export.controller';
import { BannerExportService } from './banner-export.service';
import { BannerZipService } from './services/banner-zip.service';
import { BannerExportCacheService } from './services/banner-export-cache.service';
import { BannerExportJobService } from './services/banner-export-job.service';
import { FigmaRateLimitService } from './services/figma-rate-limit.service';
import { FigmaApiService } from './services/figma-api.service';
import { BannerImageProcessorService } from './services/banner-image-processor.service';

@Module({
  imports: [PassportModule],
  controllers: [BannerExportController],
  providers: [
    BannerExportService,
    JwtStrategy,
    BannerZipService,
    BannerExportCacheService,
    BannerExportJobService,
    FigmaRateLimitService,
    FigmaApiService,
    BannerImageProcessorService,
  ],
})
export class BannerExportModule {}
