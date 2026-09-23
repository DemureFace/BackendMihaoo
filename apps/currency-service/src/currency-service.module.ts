import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { CurrencyModule } from './currency/currency.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CurrencyModule,
    HealthModule.forRoot({ serviceName: 'currency-service' }),
  ],
})
export class CurrencyServiceModule {}
