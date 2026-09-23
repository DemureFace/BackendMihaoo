import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

type ServiceStatus = 'ok' | 'error';

const CHECK_TIMEOUT_MS = 3000;

// Each downstream service's base URL env var. Checked via its own /health,
// not /ready — a system view shouldn't flip to "error" just because one
// service's database is briefly unreachable.
const DOWNSTREAM_SERVICES: { name: string; urlKey: string }[] = [
  { name: 'auth-service', urlKey: 'AUTH_SERVICE_URL' },
  { name: 'currency-service', urlKey: 'CURRENCY_SERVICE_URL' },
  { name: 'tournament-service', urlKey: 'TOURNAMENT_SERVICE_URL' },
  { name: 'bonus-service', urlKey: 'BONUS_SERVICE_URL' },
  { name: 'checklist-service', urlKey: 'CHECKLIST_SERVICE_URL' },
  { name: 'banner-export-service', urlKey: 'BANNER_EXPORT_SERVICE_URL' },
  { name: 'analytics-service', urlKey: 'ANALYTICS_SERVICE_URL' },
];

@Controller('health')
export class SystemHealthController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get('system')
  async getSystemHealth() {
    const checks = await Promise.all(
      DOWNSTREAM_SERVICES.map(({ name, urlKey }) =>
        this.checkService(name, urlKey),
      ),
    );

    const services: Record<string, ServiceStatus> = { gateway: 'ok' };
    for (const { name, status } of checks) {
      services[name] = status;
    }

    const healthy = Object.values(services).every((status) => status === 'ok');
    const status: ServiceStatus = healthy ? 'ok' : 'error';
    const result = { status, timestamp: new Date().toISOString(), services };

    if (!healthy) {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  private async checkService(
    name: string,
    urlKey: string,
  ): Promise<{ name: string; status: ServiceStatus }> {
    const baseUrl = this.configService.get<string>(urlKey);
    if (!baseUrl) {
      return { name, status: 'error' };
    }

    try {
      await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`, {
          timeout: CHECK_TIMEOUT_MS,
        }),
      );
      return { name, status: 'ok' };
    } catch {
      return { name, status: 'error' };
    }
  }
}
