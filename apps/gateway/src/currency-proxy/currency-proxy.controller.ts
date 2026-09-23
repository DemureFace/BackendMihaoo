import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError, withGetRetry } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('currency')
export class CurrencyProxyController {
  private readonly currencyServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.currencyServiceUrl = this.configService.getOrThrow<string>(
      'CURRENCY_SERVICE_URL',
    );
  }

  @Get('sites')
  async listSites(
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(`${this.currencyServiceUrl}/currency/sites`, {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
          }),
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Post('convert')
  async convert(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.currencyServiceUrl}/currency/convert`,
          body,
          {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
          },
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }
}
