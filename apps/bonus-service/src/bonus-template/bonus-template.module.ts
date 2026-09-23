import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { BonusTemplateController } from './bonus-template.controller';
import { BonusTemplateService } from './bonus-template.service';
import { PromoParserService } from './promo-parser.service';

@Module({
  imports: [PassportModule],
  controllers: [BonusTemplateController],
  providers: [BonusTemplateService, PromoParserService, JwtStrategy],
})
export class BonusTemplateModule {}
