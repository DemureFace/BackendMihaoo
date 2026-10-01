import { BadRequestException, Injectable } from '@nestjs/common';
import { Brand, Platform, TaskType } from '../generated/prisma';
import {
  BRAND_NAMES,
  BRAND_PLATFORM_MAP,
  PLATFORM_NAMES,
  TASK_TYPE_NAMES,
  isBrandValidForPlatform,
} from './reference-data.constants';

// RO existed before this ticket and is excluded here on purpose — see the
// Brand enum comment in schema.prisma.
const SELECTABLE_BRANDS = Object.values(Brand).filter((b) => b !== Brand.RO);

@Injectable()
export class ReferenceDataService {
  getReferenceData() {
    return {
      platforms: Object.values(Platform).map((code) => ({
        code,
        name: PLATFORM_NAMES[code],
      })),
      brands: SELECTABLE_BRANDS.map((code) => ({
        code,
        name: BRAND_NAMES[code],
      })),
      taskTypes: Object.values(TaskType).map((code) => ({
        code,
        name: TASK_TYPE_NAMES[code],
      })),
      // Which brands are valid for each platform. RANDOM isn't listed under
      // any platform here because it's valid for all of them — see the
      // "Без бренду" note on isBrandValidForPlatform's callers.
      brandsByPlatform: Object.fromEntries(
        Object.entries(BRAND_PLATFORM_MAP).map(([platform, brands]) => [
          platform,
          brands.map((code) => ({ code, name: BRAND_NAMES[code] })),
        ]),
      ),
    };
  }

  // Throws a validation error for any brand not valid on the given
  // platform (RANDOM is always valid). Used by TasksService on create so a
  // mismatched brand/platform pair never reaches the database.
  assertValidBrandsForPlatform(platform: Platform, brands: Brand[]) {
    const invalid = brands.filter((b) => !isBrandValidForPlatform(b, platform));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Brand(s) not valid for platform ${platform}: ${invalid.join(', ')}`,
      );
    }
  }
}
