import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError, withGetRetry } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('reference-data')
export class ReferenceDataProxyController {
  private readonly analyticsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.analyticsServiceUrl = this.configService.getOrThrow<string>(
      'ANALYTICS_SERVICE_URL',
    );
  }

  @Get()
  async get(
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    const send = () =>
      firstValueFrom(
        this.httpService.get(`${this.analyticsServiceUrl}/reference-data`, {
          headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
        }),
      );
    try {
      const response = await withGetRetry(send);
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }
}
