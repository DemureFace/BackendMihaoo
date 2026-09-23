import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateMwPageDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsOptional()
  @IsObject()
  moneySnippetOverrides?: Record<string, string>;
}
