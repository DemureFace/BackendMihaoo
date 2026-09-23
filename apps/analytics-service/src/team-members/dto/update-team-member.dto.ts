import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTeamMemberDto } from './create-team-member.dto';

export class UpdateTeamMemberDto extends PartialType(CreateTeamMemberDto) {
  // The watchlist on/off toggle.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
