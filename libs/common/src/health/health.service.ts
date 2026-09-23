import { Injectable } from '@nestjs/common';
import { getAppVersion } from './app-version';

export type HealthStatus = 'ok' | 'error';

export interface LivenessResult {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}

export interface ReadinessResult {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  checks: Record<string, HealthStatus>;
}

@Injectable()
export class HealthService {
  getLiveness(serviceName: string): LivenessResult {
    return {
      status: 'ok',
      service: serviceName,
      version: getAppVersion(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(
    serviceName: string,
    checks: Record<string, () => Promise<unknown>>,
  ): Promise<{ result: ReadinessResult; healthy: boolean }> {
    const entries = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await check();
          return [name, 'ok'] as const;
        } catch {
          return [name, 'error'] as const;
        }
      }),
    );

    const healthy = entries.every(([, status]) => status === 'ok');

    return {
      healthy,
      result: {
        status: healthy ? 'ok' : 'error',
        service: serviceName,
        version: getAppVersion(),
        timestamp: new Date().toISOString(),
        checks: Object.fromEntries(entries),
      },
    };
  }
}
