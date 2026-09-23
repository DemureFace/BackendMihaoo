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
@Controller('checklists')
export class ChecklistProxyController {
  private readonly checklistServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.checklistServiceUrl = this.configService.getOrThrow<string>(
      'CHECKLIST_SERVICE_URL',
    );
  }

  private async forward(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    authorization: string,
    correlationId: string,
    body?: unknown,
  ) {
    const send = () =>
      firstValueFrom(
        this.httpService.request({
          method,
          url: `${this.checklistServiceUrl}/checklists${path}`,
          data: body,
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
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('get', '', authorization, correlationId);
  }

  // Registered before `completions/:id` so "all" is routed here, not
  // forwarded as a literal id lookup.
  @Get('completions/all')
  findAllCompletions(
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'get',
      '/completions/all',
      authorization,
      correlationId,
    );
  }

  @Get('completions/:id')
  findCompletion(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'get',
      `/completions/${id}`,
      authorization,
      correlationId,
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

  @Post(':id/completions')
  submit(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'post',
      `/${id}/completions`,
      authorization,
      correlationId,
      body,
    );
  }
}
