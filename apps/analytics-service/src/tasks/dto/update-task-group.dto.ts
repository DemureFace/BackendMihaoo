import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TaskType } from '../../generated/prisma';

// The shared fields living on TaskGroup, not TaskBrand — editing these
// goes through PATCH /tasks/:id/group, an explicit, separate action from
// PATCH /tasks/:id (which only ever touches the one row it's called on).
// Platform and brands aren't here: changing platform can invalidate the
// group's existing brand/platform pairing, and brand membership is a
// create/delete-a-row operation, not a field edit.
export class UpdateTaskGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsInt()
  requestedById?: number;

  @IsOptional()
  @IsString()
  jiraKey?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
