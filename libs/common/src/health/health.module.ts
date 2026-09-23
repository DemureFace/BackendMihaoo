import {
  DynamicModule,
  InjectionToken,
  Module,
  Provider,
} from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DATABASE_HEALTH_CHECK, HEALTH_SERVICE_NAME } from './health.tokens';
import type { DatabaseHealthCheck } from './health.tokens';

export interface HealthModuleOptions {
  serviceName: string;
  /**
   * Wires the /ready database check to a service-specific client (e.g. each
   * app's own generated PrismaService) without libs/common depending on it.
   */
  databaseCheck?: {
    inject: InjectionToken[];

    useFactory: (...args: any[]) => DatabaseHealthCheck;
  };
}

@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    const providers: Provider[] = [
      HealthService,
      { provide: HEALTH_SERVICE_NAME, useValue: options.serviceName },
    ];

    if (options.databaseCheck) {
      providers.push({
        provide: DATABASE_HEALTH_CHECK,
        useFactory: options.databaseCheck.useFactory,
        inject: options.databaseCheck.inject,
      });
    }

    return {
      module: HealthModule,
      controllers: [HealthController],
      providers,
    };
  }
}
