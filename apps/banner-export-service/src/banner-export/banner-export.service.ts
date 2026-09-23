import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import {
  BannerExportNodeDto,
  CreateBannerExportDto,
} from './dto/create-banner-export.dto';
import { InspectBannerExportDto } from './dto/inspect-banner-export.dto';
import { BannerExportManifest } from './types/banner-export.types';
import { parseFigmaUrl, extractFigmaFileKey } from './utils/figma-url.util';
import { safeFileName } from './utils/safe-file-name.util';
import { normalizeScale } from './utils/scale.util';
import { BannerZipService } from './services/banner-zip.service';
import { BannerExportCacheService } from './services/banner-export-cache.service';
import { BannerExportJobService } from './services/banner-export-job.service';
import { FigmaRateLimitService } from './services/figma-rate-limit.service';
import { FigmaApiService } from './services/figma-api.service';
import { collectBannerNodes } from './utils/collect-banner-nodes.util';
import { BannerImageProcessorService } from './services/banner-image-processor.service';

@Injectable()
export class BannerExportService {
  constructor(
    private readonly bannerZipService: BannerZipService,
    private readonly bannerExportCacheService: BannerExportCacheService,
    private readonly bannerExportJobService: BannerExportJobService,
    private readonly figmaRateLimitService: FigmaRateLimitService,
    private readonly figmaApiService: FigmaApiService,
    private readonly bannerImageProcessorService: BannerImageProcessorService,
  ) {}

  private isFigmaMockMode() {
    return process.env.FIGMA_MOCK_MODE === 'true';
  }

  private storageDir =
    process.env.BANNER_EXPORT_STORAGE || './storage/banner-exports';

  async inspect(dto: InspectBannerExportDto) {
    if (this.isFigmaMockMode()) {
      return {
        fileKey: 'mock-file-key',
        sourceNodeId: 'mock-source-node',
        sourceName: 'Mock Figma Export Frame',
        cached: true,
        banners: [
          {
            id: 'mock:300x250',
            name: 'mock_banner_300x250',
            type: 'FRAME',
            width: 300,
            height: 250,
            selected: true,
          },
          {
            id: 'mock:728x90',
            name: 'mock_banner_728x90',
            type: 'FRAME',
            width: 728,
            height: 90,
            selected: true,
          },
          {
            id: 'mock:1080x1080',
            name: 'mock_banner_1080x1080',
            type: 'FRAME',
            width: 1080,
            height: 1080,
            selected: true,
          },
        ],
      };
    }

    const cacheKey = dto.figmaUrl.trim();

    const cached = this.bannerExportCacheService.getInspectCache(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    this.figmaRateLimitService.assertAvailable();

    const parsed = parseFigmaUrl(dto.figmaUrl);

    if (!parsed.fileKey) {
      throw new BadRequestException('Could not parse Figma file key from URL');
    }

    if (!parsed.nodeId) {
      throw new BadRequestException('Could not parse Figma node id from URL');
    }

    const node = await this.figmaApiService.getFigmaNode(
      parsed.fileKey,
      parsed.nodeId,
    );

    if (!node) {
      throw new BadRequestException(
        'Figma node not found in file (check the node-id in the URL)',
      );
    }

    const banners = collectBannerNodes(node);

    const data = {
      fileKey: parsed.fileKey,
      sourceNodeId: parsed.nodeId,
      sourceName: node.name,
      banners,
    };

    this.bannerExportCacheService.setInspectCache(cacheKey, data);

    return data;
  }

  createExport(dto: CreateBannerExportDto) {
    if (!dto.nodes?.length) {
      throw new BadRequestException('nodes are required');
    }

    const figmaFileKey =
      dto.figmaFileKey || extractFigmaFileKey(dto.figmaFileUrl);

    if (!figmaFileKey) {
      throw new BadRequestException('figmaFileKey or figmaFileUrl is required');
    }

    const cacheKey = this.bannerExportCacheService.buildExportCacheKey(
      figmaFileKey,
      dto,
    );

    const cachedJob = this.bannerExportCacheService.getCachedExport(cacheKey);

    if (cachedJob) {
      return cachedJob;
    }

    const job = this.bannerExportJobService.createJob(cacheKey);
    const jobId = job.id;

    this.processExport(jobId, figmaFileKey, dto).catch((error) => {
      const retryPayload = error?.response || error;

      this.bannerExportJobService.markFailed(jobId, {
        error: retryPayload?.message || error?.message || 'Export failed',
        retryAfterSeconds: retryPayload?.retryAfterSeconds,
        retryAvailableAt: retryPayload?.retryAvailableAt,
      });
    });

    return job;
  }

  getJob(jobId: string) {
    return this.bannerExportJobService.getJob(jobId);
  }

  getZipPath(jobId: string) {
    const job = this.getJob(jobId);

    if (job.status !== 'completed' || !job.zipPath) {
      throw new BadRequestException('Export is not completed yet');
    }

    return job.zipPath;
  }

  async getManifest(jobId: string) {
    const job = this.getJob(jobId);

    if (job.status !== 'completed' || !job.zipPath) {
      throw new BadRequestException('Export is not completed yet');
    }

    const jobDir = join(this.storageDir, jobId);
    const manifestPath = join(jobDir, 'manifest.json');

    try {
      const manifestRaw = await readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestRaw);
    } catch {
      throw new NotFoundException('Manifest not found');
    }
  }
  private async processMockExport(jobId: string, dto: CreateBannerExportDto) {
    const job = this.bannerExportJobService.findJob(jobId);

    if (!job) return;

    await mkdir(this.storageDir, { recursive: true });

    const jobDir = join(this.storageDir, jobId);
    await mkdir(jobDir, { recursive: true });

    const formats = dto.formats?.length ? dto.formats : ['png', 'webp'];
    const webpQuality = dto.quality?.webp ?? 86;
    const jpegQuality = dto.quality?.jpeg ?? 86;
    const avifQuality = dto.quality?.avif ?? 50;
    const pngCompressionLevel = dto.quality?.pngCompressionLevel ?? 9;
    const shouldSharpen = dto.quality?.sharpen ?? true;

    const manifest: BannerExportManifest = {
      campaignId: dto.campaignId,
      createdAt: new Date().toISOString(),
      figmaFileKey: dto.figmaFileKey || 'mock-file-key',
      mock: true,
      formats,
      quality: {
        webp: webpQuality,
        jpeg: jpegQuality,
        avif: avifQuality,
        pngCompressionLevel,
        sharpen: shouldSharpen,
      },
      banners: [] as any[],
    };

    for (let index = 0; index < dto.nodes.length; index++) {
      const node = dto.nodes[index];
      const safeName = safeFileName(node.name || node.id);

      const width = node.width || 300;
      const height = node.height || 250;

      const baseImage = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: {
            r: 245,
            g: 245,
            b: 245,
            alpha: 1,
          },
        },
      }).composite([
        {
          input: Buffer.from(`
            <svg width="${width}" height="${height}">
              <rect x="0" y="0" width="${width}" height="${height}" fill="#f5f5f5"/>
              <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#111" stroke-width="2"/>
              <text x="24" y="48" font-size="24" font-family="Arial" fill="#111">
                ${safeName}
              </text>
              <text x="24" y="82" font-size="18" font-family="Arial" fill="#444">
                ${width}x${height}
              </text>
              <text x="24" y="${height - 28}" font-size="14" font-family="Arial" fill="#777">
                Mock Figma Export
              </text>
            </svg>
          `),
        },
      ]);
      const mockBuffer = await baseImage.png().toBuffer();

      const bannerManifest = {
        nodeId: node.id,
        name: safeName,
        originalName: node.name || node.id,
        width,
        height,
        outputs: [] as any[],
        savings: null as any,
      };

      if (formats.includes('png')) {
        const pngPath = join(jobDir, `${safeName}.png`);

        const pngInfo = await this.bannerImageProcessorService.createPng(
          mockBuffer,
          pngPath,
          {
            width,
            height,
            pngCompressionLevel,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'png',
          file: `${safeName}.png`,
          ...pngInfo,
        });
      }

      if (formats.includes('webp')) {
        const webpPath = join(jobDir, `${safeName}.webp`);

        const webpInfo = await this.bannerImageProcessorService.createWebp(
          mockBuffer,
          webpPath,
          {
            width,
            height,
            webpQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'webp',
          file: `${safeName}.webp`,
          quality: webpQuality,
          ...webpInfo,
        });
      }

      if (formats.includes('jpeg')) {
        const jpegPath = join(jobDir, `${safeName}.jpg`);

        const jpegInfo = await this.bannerImageProcessorService.createJpeg(
          mockBuffer,
          jpegPath,
          {
            width,
            height,
            jpegQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'jpeg',
          file: `${safeName}.jpg`,
          quality: jpegQuality,
          ...jpegInfo,
        });
      }

      if (formats.includes('avif')) {
        const avifPath = join(jobDir, `${safeName}.avif`);

        const avifInfo = await this.bannerImageProcessorService.createAvif(
          mockBuffer,
          avifPath,
          {
            width,
            height,
            avifQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'avif',
          file: `${safeName}.avif`,
          quality: avifQuality,
          ...avifInfo,
        });
      }

      const pngOutput = bannerManifest.outputs.find(
        (output) => output.format === 'png',
      );

      const webpOutput = bannerManifest.outputs.find(
        (output) => output.format === 'webp',
      );

      if (pngOutput && webpOutput) {
        const savedBytes = pngOutput.sizeBytes - webpOutput.sizeBytes;
        const savedPercent =
          pngOutput.sizeBytes > 0
            ? (savedBytes / pngOutput.sizeBytes) * 100
            : 0;

        bannerManifest.savings = {
          webpVsPngBytes: savedBytes,
          webpVsPngPercent: Math.round(savedPercent * 100) / 100,
        };
      }

      manifest.banners.push(bannerManifest);

      const progress = 25 + Math.round(((index + 1) / dto.nodes.length) * 55);
      this.updateProgress(jobId, progress);
    }

    const manifestPath = join(jobDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const zipPath = join(this.storageDir, `${jobId}.zip`);
    this.bannerZipService.createZip(jobDir, zipPath);

    const completedJob = this.bannerExportJobService.markCompleted(jobId, {
      zipPath,
      downloadUrl: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000'}/banner-exports/${jobId}/download`,
    });

    if (completedJob.cacheKey) {
      this.bannerExportCacheService.setExportCache(
        completedJob.cacheKey,
        completedJob,
      );
    }
  }
  private async processExport(
    jobId: string,
    figmaFileKey: string,
    dto: CreateBannerExportDto,
  ) {
    this.ensureStorageDir();

    const jobDir = join(this.storageDir, jobId);
    mkdirSync(jobDir, { recursive: true });
    if (this.isFigmaMockMode()) {
      await this.processMockExport(jobId, dto);
      return;
    }
    const formats = dto.formats?.length ? dto.formats : ['png', 'webp'];
    const webpQuality = dto.quality?.webp ?? 86;
    const jpegQuality = dto.quality?.jpeg ?? 86;
    const avifQuality = dto.quality?.avif ?? 50;
    const pngCompressionLevel = dto.quality?.pngCompressionLevel ?? 9;
    const shouldSharpen = dto.quality?.sharpen ?? true;

    this.updateProgress(jobId, 10);

    const imageUrls = await this.getImageUrlsByScale(figmaFileKey, dto.nodes);
    this.updateProgress(jobId, 25);

    const manifest: BannerExportManifest = {
      campaignId: dto.campaignId,
      createdAt: new Date().toISOString(),
      figmaFileKey,
      mock: false,
      formats,
      quality: {
        webp: webpQuality,
        jpeg: jpegQuality,
        avif: avifQuality,
        pngCompressionLevel,
        sharpen: shouldSharpen,
      },
      banners: [] as any[],
    };

    for (let index = 0; index < dto.nodes.length; index++) {
      const node = dto.nodes[index];
      const imageUrl = imageUrls[node.id];

      if (!imageUrl) {
        manifest.banners.push({
          nodeId: node.id,
          name: node.name || node.id,
          originalName: node.name || node.id,
          width: node.width,
          height: node.height,
          status: 'skipped',
          reason: 'Figma did not return image URL for this node',
          outputs: [],
          savings: null,
        });

        continue;
      }

      const originalBuffer = await this.figmaApiService.downloadImage(imageUrl);

      const width = node.width || 300;
      const height = node.height || 250;

      const safeName = safeFileName(node.name || node.id);

      const bannerManifest = {
        nodeId: node.id,
        name: safeName,
        originalName: node.name || node.id,
        width,
        height,
        outputs: [] as any[],
        savings: null as any,
      };

      if (formats.includes('png')) {
        const pngPath = join(jobDir, `${safeName}.png`);

        const pngInfo = await this.bannerImageProcessorService.createPng(
          originalBuffer,
          pngPath,
          {
            width,
            height,
            pngCompressionLevel,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'png',
          file: `${safeName}.png`,
          ...pngInfo,
        });
      }

      if (formats.includes('webp')) {
        const webpPath = join(jobDir, `${safeName}.webp`);

        const webpInfo = await this.bannerImageProcessorService.createWebp(
          originalBuffer,
          webpPath,
          {
            width,
            height,
            webpQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'webp',
          file: `${safeName}.webp`,
          quality: webpQuality,
          ...webpInfo,
        });
      }

      if (formats.includes('jpeg')) {
        const jpegPath = join(jobDir, `${safeName}.jpg`);

        const jpegInfo = await this.bannerImageProcessorService.createJpeg(
          originalBuffer,
          jpegPath,
          {
            width,
            height,
            jpegQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'jpeg',
          file: `${safeName}.jpg`,
          quality: jpegQuality,
          ...jpegInfo,
        });
      }

      if (formats.includes('avif')) {
        const avifPath = join(jobDir, `${safeName}.avif`);

        const avifInfo = await this.bannerImageProcessorService.createAvif(
          originalBuffer,
          avifPath,
          {
            width,
            height,
            avifQuality,
            sharpen: shouldSharpen,
          },
        );

        bannerManifest.outputs.push({
          format: 'avif',
          file: `${safeName}.avif`,
          quality: avifQuality,
          ...avifInfo,
        });
      }

      const pngOutput = bannerManifest.outputs.find(
        (output) => output.format === 'png',
      );

      const webpOutput = bannerManifest.outputs.find(
        (output) => output.format === 'webp',
      );

      bannerManifest.savings =
        this.bannerImageProcessorService.calculateWebpSavings(
          pngOutput?.sizeBytes,
          webpOutput?.sizeBytes,
        );

      manifest.banners.push(bannerManifest);

      const progress = 25 + Math.round(((index + 1) / dto.nodes.length) * 55);
      this.updateProgress(jobId, progress);
    }
    const manifestPath = join(jobDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    this.updateProgress(jobId, 85);

    const zipPath = join(this.storageDir, `${jobId}.zip`);
    this.bannerZipService.createZip(jobDir, zipPath);

    const backendUrl =
      process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';

    const completedJob = this.bannerExportJobService.markCompleted(jobId, {
      zipPath,
      downloadUrl: `${backendUrl}/banner-exports/${jobId}/download`,
    });

    if (completedJob.cacheKey) {
      this.bannerExportCacheService.setExportCache(
        completedJob.cacheKey,
        completedJob,
      );
    }
  }

  private async getImageUrlsByScale(
    figmaFileKey: string,
    nodes: BannerExportNodeDto[],
  ) {
    const nodeIdsByScale = new Map<number, string[]>();

    for (const node of nodes) {
      const scale = normalizeScale(node.scale);
      const nodeIds = nodeIdsByScale.get(scale) || [];
      nodeIds.push(node.id);
      nodeIdsByScale.set(scale, nodeIds);
    }

    const imageUrls: Record<string, string> = {};

    for (const [scale, nodeIds] of nodeIdsByScale) {
      const urlsForScale = await this.figmaApiService.getFigmaImageUrls(
        figmaFileKey,
        nodeIds,
        scale,
      );
      Object.assign(imageUrls, urlsForScale);
    }

    return imageUrls;
  }

  private updateProgress(jobId: string, progress: number) {
    this.bannerExportJobService.updateProgress(jobId, progress);
  }

  private ensureStorageDir() {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }
}
