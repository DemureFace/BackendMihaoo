import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from 'common/common';
import { BannerExportService } from './banner-export.service';
import { CreateBannerExportDto } from './dto/create-banner-export.dto';
import { InspectBannerExportDto } from './dto/inspect-banner-export.dto';

@UseGuards(JwtAuthGuard)
@Controller('banner-exports')
export class BannerExportController {
  constructor(private readonly bannerExportService: BannerExportService) {}

  @Post('inspect')
  inspect(@Body() dto: InspectBannerExportDto) {
    return this.bannerExportService.inspect(dto);
  }

  @Post()
  create(@Body() dto: CreateBannerExportDto) {
    return this.bannerExportService.createExport(dto);
  }

  @Get(':id')
  getJob(@Param('id') id: string) {
    return this.bannerExportService.getJob(id);
  }

  @Get(':id/manifest')
  getManifest(@Param('id') id: string) {
    return this.bannerExportService.getManifest(id);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Res() res: Response) {
    const zipPath = this.bannerExportService.getZipPath(id);
    return res.download(zipPath);
  }
}
