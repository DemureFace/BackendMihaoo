import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { CreateBannerExportDto } from '../dto/create-banner-export.dto';
import { ExportJob } from '../types/banner-export.types';
import { normalizeScale } from '../utils/scale.util';

@Injectable()
export class BannerExportCacheService {
  private inspectCache = new Map<string, { expiresAt: number; data: any }>();

  private exportCache = new Map<
    string,
    {
      expiresAt: number;
      job: ExportJob;
    }
  >();

  getInspectCache(figmaUrl: string) {
    const cached = this.inspectCache.get(figmaUrl);

    if (!cached) return null;

    if (cached.expiresAt <= Date.now()) {
      this.inspectCache.delete(figmaUrl);
      return null;
    }

    return cached.data;
  }

  setInspectCache(figmaUrl: string, data: any) {
    this.inspectCache.set(figmaUrl, {
      expiresAt: Date.now() + 30 * 60 * 1000,
      data,
    });
  }

  buildExportCacheKey(figmaFileKey: string, dto: CreateBannerExportDto) {
    const nodes = [...dto.nodes]
      .map((node) => ({
        id: node.id,
        name: node.name || '',
        width: node.width || null,
        height: node.height || null,
        scale: normalizeScale(node.scale),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const formats = [
      ...(dto.formats?.length ? dto.formats : ['png', 'webp']),
    ].sort();

    const quality = {
      webp: dto.quality?.webp ?? 86,
      pngCompressionLevel: dto.quality?.pngCompressionLevel ?? 9,
      sharpen: dto.quality?.sharpen ?? true,
    };

    return JSON.stringify({
      figmaFileKey,
      nodes,
      formats,
      quality,
    });
  }

  getCachedExport(cacheKey: string) {
    const cached = this.exportCache.get(cacheKey);

    if (!cached) return null;

    if (cached.expiresAt <= Date.now()) {
      this.exportCache.delete(cacheKey);
      return null;
    }

    const zipStillExists = cached.job.zipPath && existsSync(cached.job.zipPath);

    if (!zipStillExists) {
      this.exportCache.delete(cacheKey);
      return null;
    }

    return {
      ...cached.job,
      cached: true,
    };
  }

  setExportCache(cacheKey: string, job: ExportJob) {
    this.exportCache.set(cacheKey, {
      expiresAt: Date.now() + 60 * 60 * 1000,
      job: {
        ...job,
        cached: true,
      },
    });
  }
}
