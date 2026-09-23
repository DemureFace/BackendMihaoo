import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { CURRENCY_CONFIG, currencyConfig } from './config/currency.config';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [PassportModule, TranslationModule],
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    JwtStrategy,
    { provide: CURRENCY_CONFIG, useValue: currencyConfig },
  ],
})
export class CurrencyModule {}
