import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError, withGetRetry } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class TournamentProxyController {
  private readonly tournamentServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tournamentServiceUrl = this.configService.getOrThrow<string>(
      'TOURNAMENT_SERVICE_URL',
    );
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(`${this.tournamentServiceUrl}/tournaments`, {
            headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
          }),
        ),
      );
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await withGetRetry(() =>
        firstValueFrom(
          this.httpService.get(
            `${this.tournamentServiceUrl}/tournaments/${id}`,
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

  @Post()
  async create(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.tournamentServiceUrl}/tournaments`,
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

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.tournamentServiceUrl}/tournaments/${id}`,
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

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.tournamentServiceUrl}/tournaments/${id}`,
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
