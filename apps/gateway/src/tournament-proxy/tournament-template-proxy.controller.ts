import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('tournament-templates')
export class TournamentTemplateProxyController {
  private readonly tournamentServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tournamentServiceUrl = this.configService.getOrThrow<string>(
      'TOURNAMENT_SERVICE_URL',
    );
  }

  private async forward(
    path: string,
    body: unknown,
    authorization: string,
    correlationId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.tournamentServiceUrl}/tournament-templates/${path}`,
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

  @Post('parse')
  parse(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('parse', body, authorization, correlationId);
  }

  @Post('render')
  render(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('render', body, authorization, correlationId);
  }

  @Post('generate')
  generate(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate', body, authorization, correlationId);
  }

  @Post('generate/text')
  generateText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/text', body, authorization, correlationId);
  }

  @Post('generate/snippet')
  generateSnippet(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/snippet', body, authorization, correlationId);
  }

  @Post('generate/snippet/text')
  generateSnippetText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/snippet/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/locales')
  generateLocales(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/locales', body, authorization, correlationId);
  }

  @Post('generate/locales/text')
  generateLocalesText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/locales/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/ordinary')
  generateOrdinary(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/ordinary',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/ordinary/text')
  generateOrdinaryText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/ordinary/text',
      body,
      authorization,
      correlationId,
    );
  }
}
