import { IsOptional, IsString, MinLength } from 'class-validator';

export class ParseTournamentTextDto {
  @IsString()
  @MinLength(10)
  text: string;

  // Optional here since /parse is only a preview of the parsed fields —
  // /generate and friends require imageUrlDesktop to actually render.
  @IsOptional()
  @IsString()
  imageUrlDesktop?: string;

  @IsOptional()
  @IsString()
  imageUrlMobile?: string;
}
