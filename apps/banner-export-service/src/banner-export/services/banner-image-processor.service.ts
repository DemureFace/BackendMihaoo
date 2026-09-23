import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { stat } from 'fs/promises';

@Injectable()
export class BannerImageProcessorService {
  async getFileInfo(filePath: string) {
    const fileStat = await stat(filePath);
    const sizeBytes = fileStat.size;

    return {
      sizeBytes,
      sizeKb: Math.round((sizeBytes / 1024) * 100) / 100,
    };
  }

  async createPng(
    imageBuffer: Buffer,
    outputPath: string,
    options: {
      width: number;
      height: number;
      pngCompressionLevel: number;
      sharpen: boolean;
    },
  ) {
    let pipeline = sharp(imageBuffer).resize(options.width, options.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    await pipeline
      .png({
        compressionLevel: options.pngCompressionLevel,
        adaptiveFiltering: true,
      })
      .toFile(outputPath);

    return this.getFileInfo(outputPath);
  }

  async createWebp(
    imageBuffer: Buffer,
    outputPath: string,
    options: {
      width: number;
      height: number;
      webpQuality: number;
      sharpen: boolean;
    },
  ) {
    let pipeline = sharp(imageBuffer).resize(options.width, options.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    await pipeline
      .webp({
        quality: options.webpQuality,
      })
      .toFile(outputPath);

    return this.getFileInfo(outputPath);
  }

  async createJpeg(
    imageBuffer: Buffer,
    outputPath: string,
    options: {
      width: number;
      height: number;
      jpegQuality: number;
      sharpen: boolean;
    },
  ) {
    let pipeline = sharp(imageBuffer).resize(options.width, options.height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });

    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    await pipeline
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({
        quality: options.jpegQuality,
      })
      .toFile(outputPath);

    return this.getFileInfo(outputPath);
  }

  async createAvif(
    imageBuffer: Buffer,
    outputPath: string,
    options: {
      width: number;
      height: number;
      avifQuality: number;
      sharpen: boolean;
    },
  ) {
    let pipeline = sharp(imageBuffer).resize(options.width, options.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    await pipeline
      .avif({
        quality: options.avifQuality,
      })
      .toFile(outputPath);

    return this.getFileInfo(outputPath);
  }

  calculateWebpSavings(pngSizeBytes?: number, webpSizeBytes?: number) {
    if (!pngSizeBytes || !webpSizeBytes) {
      return null;
    }

    const webpVsPngBytes = pngSizeBytes - webpSizeBytes;
    const webpVsPngPercent =
      pngSizeBytes > 0
        ? Math.round((webpVsPngBytes / pngSizeBytes) * 10000) / 100
        : 0;

    return {
      webpVsPngBytes,
      webpVsPngPercent,
    };
  }

  async createMockBaseImage(options: {
    width: number;
    height: number;
    title: string;
    subtitle?: string;
  }) {
    const subtitle = options.subtitle || `${options.width} x ${options.height}`;

    const svg = `
      <svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111827"/>
        <rect x="16" y="16" width="${options.width - 32}" height="${options.height - 32}" rx="18" fill="#2563eb"/>
        <text x="50%" y="45%" text-anchor="middle" font-size="28" fill="white" font-family="Arial" font-weight="700">
          ${this.escapeSvgText(options.title)}
        </text>
        <text x="50%" y="58%" text-anchor="middle" font-size="18" fill="#dbeafe" font-family="Arial">
          ${this.escapeSvgText(subtitle)}
        </text>
      </svg>
    `;

    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  private escapeSvgText(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
