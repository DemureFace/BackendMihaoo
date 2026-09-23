import { IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateBonusPageDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  prize: string;

  @IsOptional()
  @IsString()
  snippetPrizeName?: string;

  @IsString()
  @MinLength(1)
  imgUrl: string;

  @IsString()
  @MinLength(1)
  heading: string;

  @IsString()
  @MinLength(1)
  introHtml: string;

  @IsString()
  @MinLength(1)
  tiersHtml: string;

  @IsString()
  @MinLength(1)
  closingHtml: string;

  @IsString()
  @MinLength(1)
  bonusCode: string;

  @IsString()
  @MinLength(1)
  rulesHtml: string;
}
