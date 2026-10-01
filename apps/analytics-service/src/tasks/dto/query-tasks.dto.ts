import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Brand, Platform, TaskStatus, TaskType } from '../../generated/prisma';

export enum TaskSortField {
  REPORT_DATE = 'reportDate',
  DUE_DATE = 'dueDate',
  CREATED_AT = 'createdAt',
  STORY_POINTS = 'storyPoints',
  STATUS = 'status',
}

export type SortOrder = 'asc' | 'desc';

// Accepts either repeated query params (?brand=JC&brand=MW, which Express's
// query parser already turns into an array) or one comma-separated value
// (?brand=JC,MW) — either way normalizes to a trimmed, empty-free string
// array, or undefined for "not provided" so the caller can tell that apart
// from "provided but empty".
function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = raw.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function toNumberArray(value: unknown): number[] | undefined {
  return toStringArray(value)?.map(Number);
}

export class QueryTasksDto {
  // Empty/omitted means "all" for every filter below — an empty array is
  // normalized to undefined by the transforms above, so the service never
  // has to special-case "filter present but empty".
  @IsOptional()
  @Transform(({ value }) => toNumberArray(value))
  @IsArray()
  @IsInt({ each: true })
  executorId?: number[];

  @IsOptional()
  @Transform(({ value }) => toNumberArray(value))
  @IsArray()
  @IsInt({ each: true })
  requestedById?: number[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(Brand, { each: true })
  brand?: Brand[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(Platform, { each: true })
  platform?: Platform[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(TaskType, { each: true })
  taskType?: TaskType[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  // Both bounds are inclusive. A date-only value (e.g. "2026-09-01") for
  // `to` is extended to the end of that day — see endOfDayIfDateOnly in
  // tasks.service.ts — so "to the 1st" includes everything reported on the
  // 1st, not just up to midnight.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TaskSortField)
  sortBy?: TaskSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  take?: number;
}
