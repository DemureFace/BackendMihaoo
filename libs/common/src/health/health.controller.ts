import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { DATABASE_HEALTH_CHECK, HEALTH_SERVICE_NAME } from './health.tokens';
import type { DatabaseHealthCheck } from './health.tokens';

@Controller()
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE_NAME) private readonly serviceName: string,
    private readonly healthService: HealthService,
    @Optional()
    @Inject(DATABASE_HEALTH_CHECK)
    private readonly checkDatabase?: DatabaseHealthCheck,
  ) {}

  @Get('health')
  @HttpCode(200)
  getHealth() {
    return this.healthService.getLiveness(this.serviceName);
  }

  @Get('ready')
  async getReadiness() {
    const checks: Record<string, () => Promise<unknown>> = this.checkDatabase
      ? { database: this.checkDatabase }
      : {};
    const { result, healthy } = await this.healthService.getReadiness(
      this.serviceName,
      checks,
    );

    if (!healthy) {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
