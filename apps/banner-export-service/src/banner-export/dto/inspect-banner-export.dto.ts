import { IsString } from 'class-validator';

export class InspectBannerExportDto {
  @IsString()
  figmaUrl: string;
}
