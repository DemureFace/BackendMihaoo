import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChecklistAnswerDto {
  @IsString()
  @MinLength(1)
  itemId: string;

  @IsBoolean()
  checked: boolean;
}

export class SubmitChecklistDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChecklistAnswerDto)
  answers: ChecklistAnswerDto[];
}
