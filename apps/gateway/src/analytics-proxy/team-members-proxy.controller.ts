import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError, withGetRetry } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('team-members')
export class TeamMembersProxyController {
  private readonly analyticsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.analyticsServiceUrl = this.configService.getOrThrow<string>(
      'ANALYTICS_SERVICE_URL',
    );
  }

  private async forward(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    authorization: string,
    correlationId: string,
    body?: unknown,
    params?: Record<string, string>,
  ) {
    const send = () =>
      firstValueFrom(
        this.httpService.request({
          method,
          url: `${this.analyticsServiceUrl}/team-members${path}`,
          data: body,
          params,
          headers: { authorization, [CORRELATION_ID_HEADER]: correlationId },
        }),
      );
    try {
      const response = await (method === 'get' ? withGetRetry(send) : send());
      return response.data;
    } catch (error) {
      rethrowUpstreamError(error);
    }
  }

  @Get()
  findAll(
    @Query() query: Record<string, string>,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'get',
      '',
      authorization,
      correlationId,
      undefined,
      query,
    );
  }

  // Registered before ':id' so "auth-search" is routed here, not forwarded
  // as a literal id lookup.
  @Get('auth-search')
  searchAuthUsers(
    @Query() query: Record<string, string>,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'get',
      '/auth-search',
      authorization,
      correlationId,
      undefined,
      query,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('get', `/${id}`, authorization, correlationId);
  }

  @Post()
  create(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('post', '', authorization, correlationId, body);
  }

  @Post('import')
  importFromAuth(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('post', '/import', authorization, correlationId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('patch', `/${id}`, authorization, correlationId, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('delete', `/${id}`, authorization, correlationId);
  }
}
