import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { BonusTemplateService } from './bonus-template.service';
import { PromoSegmentOptions } from './brands/render-options.type';
import { GenerateBonusPageDto } from './dto/generate-bonus-page.dto';
import { GenerateCompactCardDto } from './dto/generate-compact-card.dto';
import { GenerateIpContentDto } from './dto/generate-ip-content.dto';
import { GenerateMwPageDto } from './dto/generate-mw-page.dto';
import { GeneratePromoDto } from './dto/generate-promo.dto';
import { GenerateTermsRulesDto } from './dto/generate-terms-rules.dto';
import { ParsePromoTextDto } from './dto/parse-promo-text.dto';
import { PromoRenderResult } from './dto/promo-render-result.dto';
import { RenderPromoDto } from './dto/render-promo.dto';

function toOptions(
  dto: GeneratePromoDto | RenderPromoDto,
): PromoSegmentOptions {
  return {
    segment: dto.segment,
    publishDateRange: dto.publishDateRange,
    imageUrlDesktop: dto.imageUrlDesktop,
    imageUrlMobile: dto.imageUrlMobile,
    description: dto.description,
    subtitle: dto.subtitle,
    cardType: dto.cardType,
    buttonTitle: dto.buttonTitle,
    termsLink: dto.termsLink,
    allowedForGroups: dto.allowedForGroups,
    disallowedForGroups: dto.disallowedForGroups,
  };
}

@UseGuards(JwtAuthGuard)
@Controller('bonus-templates')
export class BonusTemplateController {
  constructor(private readonly templateService: BonusTemplateService) {}

  @Post('parse')
  parse(@Body() dto: ParsePromoTextDto) {
    return this.templateService.parseText(dto.text, dto.brand);
  }

  @Post('render')
  render(@Body() dto: RenderPromoDto) {
    return this.templateService.render(
      dto.parsed,
      dto.brand,
      dto.imageUrl,
      dto.moneySnippetOverrides,
      toOptions(dto),
    );
  }

  @Post('generate')
  generate(@Body() dto: GeneratePromoDto) {
    return this.templateService.generate(
      dto.text,
      dto.brand,
      dto.imageUrl,
      dto.moneySnippetOverrides,
      toOptions(dto),
    );
  }

  @Post('generate/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateText(@Body() dto: GeneratePromoDto): string {
    return this.requireField(this.generate(dto), 'template', dto.brand);
  }

  @Post('generate/card')
  generateCard(@Body() dto: GeneratePromoDto) {
    return this.requireField(this.generate(dto), 'card', dto.brand);
  }

  @Post('generate/card/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateCardText(@Body() dto: GeneratePromoDto): string {
    return JSON.stringify(this.generateCard(dto), null, 2);
  }

  @Post('generate/rules')
  generateRules(@Body() dto: GeneratePromoDto) {
    return {
      rulesHtml: this.requireField(this.generate(dto), 'rulesHtml', dto.brand),
    };
  }

  @Post('generate/rules/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateRulesText(@Body() dto: GeneratePromoDto): string {
    return this.requireField(this.generate(dto), 'rulesHtml', dto.brand);
  }

  @Post('generate/terms-rules')
  generateTermsRules(@Body() dto: GenerateTermsRulesDto) {
    return {
      rulesHtml: this.templateService.generateTermsRules(
        dto.text,
        dto.brand,
        dto.title,
        dto.moneySnippetOverrides,
      ),
    };
  }

  @Post('generate/terms-rules/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateTermsRulesText(@Body() dto: GenerateTermsRulesDto): string {
    return this.templateService.generateTermsRules(
      dto.text,
      dto.brand,
      dto.title,
      dto.moneySnippetOverrides,
    );
  }

  @Post('generate/card-compact')
  generateCompactCard(@Body() dto: GenerateCompactCardDto) {
    const imageUrl = dto.imageUrl ?? dto.bg;
    if (!imageUrl) {
      throw new BadRequestException(
        'generate/card-compact requires "imageUrl" (or "bg")',
      );
    }
    return this.templateService.generateCompactCard(
      dto.text,
      dto.brand,
      {
        imageUrl,
        imageUrlMobile: dto.imageUrlMobile ?? dto.bgMob,
        imageUrlDesktop: dto.imageUrlDesktop,
        snippetDetailsName: dto.snippetDetailsName,
        allowedForGroups: dto.allowedForGroups,
        disallowedForGroups: dto.disallowedForGroups,
        subtitle: dto.subtitle,
        title: dto.title,
        prize: dto.prize,
        category: dto.category,
        promotionLink: dto.promotionLink,
        showVipBadge: dto.showVipBadge,
        signInOnly: dto.signInOnly,
      },
      dto.cardStyle,
    );
  }

  @Post('generate/mw-page')
  generateMwPage(@Body() dto: GenerateMwPageDto) {
    return {
      template: this.templateService.generateMwPage(
        dto.text,
        dto.imageUrl,
        dto.moneySnippetOverrides,
      ),
    };
  }

  @Post('generate/mw-page/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateMwPageText(@Body() dto: GenerateMwPageDto): string {
    return this.templateService.generateMwPage(
      dto.text,
      dto.imageUrl,
      dto.moneySnippetOverrides,
    );
  }

  @Post('ip-content')
  generateIpContent(@Body() dto: GenerateIpContentDto) {
    return this.templateService.generateIpContent(dto.text);
  }

  @Post('ip-content/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateIpContentText(@Body() dto: GenerateIpContentDto): string {
    const { value, snippet } = this.templateService.generateIpContent(dto.text);
    return snippet ?? value;
  }

  @Post('generate/bonus-page')
  generateBonusPage(@Body() dto: GenerateBonusPageDto) {
    return { html: this.templateService.generateBonusPage(dto) };
  }

  @Post('generate/bonus-page/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateBonusPageText(@Body() dto: GenerateBonusPageDto): string {
    return this.templateService.generateBonusPage(dto);
  }

  private requireField<K extends keyof PromoRenderResult>(
    result: PromoRenderResult,
    field: K,
    brand: string,
  ): NonNullable<PromoRenderResult[K]> {
    const value = result[field];
    if (value === undefined) {
      throw new BadRequestException(
        `Brand "${brand}" does not produce a "${field}" artifact`,
      );
    }
    return value;
  }
}
