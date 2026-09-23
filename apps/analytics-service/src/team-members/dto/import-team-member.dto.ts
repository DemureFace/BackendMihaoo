import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Fed by the result of GET /team-members/auth-search — the caller already
// has {id, email} from that response, so importing costs no second call
// to auth-service.
export class ImportTeamMemberDto {
  @IsString()
  @MinLength(1)
  authUserId: string;

  @IsEmail()
  email: string;

  // Falls back to deriveDisplayName(email) in the service if omitted; pass
  // this to let the caller override the derived name before saving.
  @IsOptional()
  @IsString()
  displayName?: string;
}
