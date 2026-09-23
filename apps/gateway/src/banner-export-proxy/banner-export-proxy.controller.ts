import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError, withGetRetry } from '../http-proxy.util';

// Figma rendering / zip assembly can run well past the 5s module default
// (docs/service-communication.md), so these three calls get their own budget.
const EXPORT_JOB_TIMEOUT_MS = 30000;

@UseGuards(JwtAuthGuard)
@Controller('banner-exports')
export class BannerExportProxyController {
  private readonly bannerExportServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.bannerExportServiceUrl = this.configService.getOrThrow<string>(
      'BANNER_EXPORT_SERVICE_URL',
    );
  }

  @Post('inspect')
  async inspect(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bannerExportServiceUrl}/banner-exports/inspect`,
          body,
          {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
            timeout: EXPORT_JOB_TIMEOUT_MS,
          },
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bannerExportServiceUrl}/banner-exports`,
          body,
          {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
            timeout: EXPORT_JOB_TIMEOUT_MS,
          },
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Get(':id')
  async getJob(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(
            `${this.bannerExportServiceUrl}/banner-exports/${id}`,
            {
              headers: {
                authorization,
                [CORRELATION_ID_HEADER]: correlationId,
              },
            },
          ),
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Get(':id/manifest')
  async getManifest(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(
            `${this.bannerExportServiceUrl}/banner-exports/${id}/manifest`,
            {
              headers: {
                authorization,
                [CORRELATION_ID_HEADER]: correlationId,
              },
            },
          ),
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
    @Res() res: Response,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(
            `${this.bannerExportServiceUrl}/banner-exports/${id}/download`,
            {
              headers: {
                authorization,
                [CORRELATION_ID_HEADER]: correlationId,
              },
              responseType: 'stream',
              timeout: EXPORT_JOB_TIMEOUT_MS,
            },
          ),
        ),
      );

      res.setHeader(
        'content-type',
        String(response.headers['content-type'] || 'application/zip'),
      );
      if (response.headers['content-disposition']) {
        res.setHeader(
          'content-disposition',
          String(response.headers['content-disposition']),
        );
      }

      response.data.pipe(res);
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }
}
