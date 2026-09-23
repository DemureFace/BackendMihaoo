import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { GenerateOrdinaryTournamentDto } from './dto/generate-ordinary-tournament.dto';
import { GenerateTournamentDto } from './dto/generate-tournament.dto';
import { ParseTournamentTextDto } from './dto/parse-tournament-text.dto';
import { RenderTournamentDto } from './dto/render-tournament.dto';
import { TournamentTemplateService } from './tournament-template.service';

@UseGuards(JwtAuthGuard)
@Controller('tournament-templates')
export class TournamentTemplateController {
  constructor(private readonly templateService: TournamentTemplateService) {}

  @Post('parse')
  parse(@Body() dto: ParseTournamentTextDto) {
    return this.templateService.parseText(dto.text, {
      desktop: dto.imageUrlDesktop ?? '',
      mobile: dto.imageUrlMobile,
    });
  }

  @Post('render')
  render(@Body() dto: RenderTournamentDto) {
    return this.templateService.render(dto.parsed, dto.brand);
  }

  @Post('generate')
  generate(@Body() dto: GenerateTournamentDto) {
    return this.templateService.generate(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    });
  }

  @Post('generate/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateText(@Body() dto: GenerateTournamentDto): string {
    return this.templateService.generate(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    }).template;
  }

  @Post('generate/snippet')
  generateSnippet(@Body() dto: GenerateTournamentDto) {
    return this.templateService.generateSnippet(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    });
  }

  @Post('generate/snippet/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateSnippetText(@Body() dto: GenerateTournamentDto): string {
    return this.templateService.generateSnippetText(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    });
  }

  @Post('generate/locales')
  generateLocales(@Body() dto: GenerateTournamentDto) {
    return this.templateService.generateLocales(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    });
  }

  @Post('generate/locales/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateLocalesText(@Body() dto: GenerateTournamentDto): string {
    return this.templateService.generateLocalesText(dto.text, dto.brand, {
      desktop: dto.imageUrlDesktop,
      mobile: dto.imageUrlMobile,
    });
  }

  private ordinaryOverrides(dto: GenerateOrdinaryTournamentDto) {
    const bgImageSrc = dto.bgImageSrc ?? dto.imageUrlDesktop;
    if (!bgImageSrc) {
      throw new BadRequestException(
        'generate/ordinary requires "bgImageSrc" (or "imageUrlDesktop")',
      );
    }
    return {
      bgImageSrc,
      bgImageSrcMob: dto.imageUrlMobile,
      frontendIdentifier: dto.frontendIdentifier,
      disallowedForGroups: dto.disallowedForGroups,
    };
  }

  @Post('generate/ordinary')
  generateOrdinary(@Body() dto: GenerateOrdinaryTournamentDto) {
    return this.templateService.generateOrdinary(
      dto.text,
      dto.brand,
      this.ordinaryOverrides(dto),
    );
  }

  @Post('generate/ordinary/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  generateOrdinaryText(@Body() dto: GenerateOrdinaryTournamentDto): string {
    return this.templateService.generateOrdinaryText(
      dto.text,
      dto.brand,
      this.ordinaryOverrides(dto),
    );
  }
}
