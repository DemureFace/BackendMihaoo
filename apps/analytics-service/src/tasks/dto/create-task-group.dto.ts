import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Brand, Platform, TaskStatus, TaskType } from '../../generated/prisma';

export class BrandExecutorDto {
  @IsEnum(Brand)
  brand: Brand;

  @IsInt()
  executorId: number;
}

export class CreateTaskGroupDto {
  // Falls back to "Без назви" in the service if left blank — matches the
  // create form, where the name field is optional.
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsEnum(TaskType)
  taskType: TaskType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(Brand, { each: true })
  brands: Brand[];

  @IsOptional()
  @IsBoolean()
  differentExecutorsPerBrand?: boolean;

  // Required unless differentExecutorsPerBrand is true — used for every brand.
  @IsOptional()
  @IsInt()
  executorId?: number;

  // Required when differentExecutorsPerBrand is true — one entry per brand.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandExecutorDto)
  brandExecutors?: BrandExecutorDto[];

  @IsInt()
  requestedById: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Governs which reporting period this task's SP counts toward.
  @IsDateString()
  reportDate: string;

  @IsNumber()
  storyPointsPerBrand: number;

  @IsOptional()
  @IsString()
  jiraKey?: string;

  // Applies to every brand row created by this submission — matches
  // storyPointsPerBrand's shared-across-the-submission shape, since
  // nothing in the prototype form suggests a per-brand status at create
  // time. Defaults to IN_PROGRESS. Lets a task be logged as already
  // complete (e.g. backfilling historical work) instead of always
  // starting IN_PROGRESS and requiring a separate PATCH.
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  // Required exactly when status is DONE — see TasksService.createTaskGroup
  // for the check — since a completed task must have a real, user-chosen
  // completion date, not a default.
  @IsOptional()
  @IsDateString()
  closedAt?: string;
}
