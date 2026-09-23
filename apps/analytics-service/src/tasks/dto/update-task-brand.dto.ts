import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { TaskStatus } from '../../generated/prisma';

export class UpdateTaskBrandDto {
  @IsOptional()
  @IsInt()
  executorId?: number;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
