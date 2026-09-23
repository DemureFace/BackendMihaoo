import { IsString, MinLength } from 'class-validator';

export class ChecklistItemDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  text: string;
}
