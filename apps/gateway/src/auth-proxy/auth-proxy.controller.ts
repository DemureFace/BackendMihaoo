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

@Controller('auth')
export class AuthProxyController {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl =
      this.configService.getOrThrow<string>('AUTH_SERVICE_URL');
  }

  @Post('register')
  async register(
    @Body() body: unknown,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/register`, body, {
          headers: { [CORRELATION_ID_HEADER]: correlationId },
        }),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/login`, body, {
          headers: { [CORRELATION_ID_HEADER]: correlationId },
        }),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(`${this.authServiceUrl}/auth/profile`, {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
          }),
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }
}
