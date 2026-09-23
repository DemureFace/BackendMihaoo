import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from 'common/common';
import { AuthProxyModule } from './auth-proxy/auth-proxy.module';
import { CurrencyProxyModule } from './currency-proxy/currency-proxy.module';
import { TournamentProxyModule } from './tournament-proxy/tournament-proxy.module';
import { BonusProxyModule } from './bonus-proxy/bonus-proxy.module';
import { ChecklistProxyModule } from './checklist-proxy/checklist-proxy.module';
import { BannerExportProxyModule } from './banner-export-proxy/banner-export-proxy.module';
import { AnalyticsProxyModule } from './analytics-proxy/analytics-proxy.module';
import { SystemHealthModule } from './system-health/system-health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthProxyModule,
    CurrencyProxyModule,
    TournamentProxyModule,
    BonusProxyModule,
    ChecklistProxyModule,
    BannerExportProxyModule,
    AnalyticsProxyModule,
    HealthModule.forRoot({ serviceName: 'gateway' }),
    SystemHealthModule,
  ],
})
export class GatewayModule {}
