import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER, JwtAuthGuard } from 'common/common';
import { rethrowUpstreamError } from '../http-proxy.util';

@UseGuards(JwtAuthGuard)
@Controller('bonus-templates')
export class BonusTemplateProxyController {
  private readonly bonusServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.bonusServiceUrl =
      this.configService.getOrThrow<string>('BONUS_SERVICE_URL');
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
          `${this.bonusServiceUrl}/bonus-templates/${path}`,
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

  @Post('generate/card')
  generateCard(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/card', body, authorization, correlationId);
  }

  @Post('generate/card/text')
  generateCardText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/card/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/rules')
  generateRules(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/rules', body, authorization, correlationId);
  }

  @Post('generate/rules/text')
  generateRulesText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/rules/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/terms-rules')
  generateTermsRules(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/terms-rules',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/terms-rules/text')
  generateTermsRulesText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/terms-rules/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/card-compact')
  generateCompactCard(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/card-compact',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/mw-page')
  generateMwPage(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('generate/mw-page', body, authorization, correlationId);
  }

  @Post('generate/mw-page/text')
  generateMwPageText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/mw-page/text',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('ip-content')
  generateIpContent(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('ip-content', body, authorization, correlationId);
  }

  @Post('ip-content/text')
  generateIpContentText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward('ip-content/text', body, authorization, correlationId);
  }

  @Post('generate/bonus-page')
  generateBonusPage(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/bonus-page',
      body,
      authorization,
      correlationId,
    );
  }

  @Post('generate/bonus-page/text')
  generateBonusPageText(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers(CORRELATION_ID_HEADER) correlationId: string,
  ) {
    return this.forward(
      'generate/bonus-page/text',
      body,
      authorization,
      correlationId,
    );
  }
}
