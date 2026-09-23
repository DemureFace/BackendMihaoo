import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
