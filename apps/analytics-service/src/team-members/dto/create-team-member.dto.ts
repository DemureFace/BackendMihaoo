import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @MinLength(1)
  displayName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Set only when "add colleague" was resolved against a real auth-service
  // account rather than typed in free-hand via the form's "+ Додати" row.
  @IsOptional()
  @IsString()
  authUserId?: string;
}
