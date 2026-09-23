import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ALLOWED_SCALES } from '../utils/scale.util';

export class BannerExportNodeDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  // Accepted so the `banners` entries returned by /inspect can be passed
  // through to /banner-exports unmodified; not used for export itself.
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(ALLOWED_SCALES)
  scale?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

export class BannerExportQualityDto {
  @IsOptional()
  @IsNumber()
  webp?: number;

  @IsOptional()
  @IsNumber()
  jpeg?: number;

  @IsOptional()
  @IsNumber()
  avif?: number;

  @IsOptional()
  @IsNumber()
  pngCompressionLevel?: number;

  @IsOptional()
  @IsBoolean()
  sharpen?: boolean;
}

export class BannerExportEnhanceDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateBannerExportDto {
  @IsString()
  campaignId: string;

  @IsOptional()
  @IsString()
  figmaFileKey?: string;

  @IsOptional()
  @IsString()
  figmaFileUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerExportNodeDto)
  nodes: BannerExportNodeDto[];

  @IsOptional()
  @IsArray()
  @IsIn(['png', 'webp', 'jpeg', 'avif'], { each: true })
  formats?: Array<'png' | 'webp' | 'jpeg' | 'avif'>;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerExportQualityDto)
  quality?: BannerExportQualityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerExportEnhanceDto)
  enhance?: BannerExportEnhanceDto;
}
