import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class FigmaRateLimitService {
  private figmaCooldownUntil = 0;

  assertAvailable() {
    const now = Date.now();

    if (this.figmaCooldownUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (this.figmaCooldownUntil - now) / 1000,
      );

      throw new BadRequestException({
        message: 'Rate limit exceeded',
        retryAfterSeconds,
        retryAvailableAt: new Date(this.figmaCooldownUntil).toISOString(),
      });
    }
  }

  activateCooldown(error: any) {
    const retryAfterSeconds = this.getRetryAfterSeconds(error);

    this.figmaCooldownUntil = Date.now() + retryAfterSeconds * 1000;

    return {
      retryAfterSeconds,
      retryAvailableAt: new Date(this.figmaCooldownUntil).toISOString(),
    };
  }

  isRateLimitError(error: any) {
    return error?.response?.status === 429;
  }

  private getRetryAfterSeconds(error: any) {
    const fallbackSeconds = 15 * 60;
    const maxCooldownSeconds = 60 * 60;

    const retryAfterHeader = error?.response?.headers?.['retry-after'];

    if (retryAfterHeader) {
      const parsed = Number(retryAfterHeader);

      if (!Number.isNaN(parsed) && parsed > 0) {
        return Math.min(parsed, maxCooldownSeconds);
      }

      const parsedDate = Date.parse(retryAfterHeader);

      if (!Number.isNaN(parsedDate)) {
        const seconds = Math.ceil((parsedDate - Date.now()) / 1000);

        if (seconds > 0) {
          return Math.min(seconds, maxCooldownSeconds);
        }
      }
    }

    return fallbackSeconds;
  }
}
