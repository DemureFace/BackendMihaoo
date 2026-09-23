export type JobStatus = 'processing' | 'completed' | 'failed';

export type ExportJob = {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string;
  retryAfterSeconds?: number;
  retryAvailableAt?: string;
  zipPath?: string;
  downloadUrl?: string;
  createdAt: string;
  cached?: boolean;
  cacheKey?: string;
};

export type BannerExportOutput = {
  format: 'png' | 'webp' | 'jpeg' | 'avif';
  file: string;
  quality?: number;
  sizeBytes: number;
  sizeKb: number;
};

export type BannerExportManifestItem = {
  nodeId: string;
  name: string;
  originalName: string;
  width?: number;
  height?: number;
  status?: 'exported' | 'skipped' | 'failed';
  reason?: string;
  outputs: BannerExportOutput[];
  savings?: {
    webpVsPngBytes: number;
    webpVsPngPercent: number;
  } | null;
};

export type BannerExportManifest = {
  campaignId?: string;
  createdAt: string;
  figmaFileKey?: string;
  mock: boolean;
  formats: string[];
  quality: {
    webp: number;
    jpeg: number;
    avif: number;
    pngCompressionLevel: number;
    sharpen: boolean;
  };
  banners: BannerExportManifestItem[];
};
