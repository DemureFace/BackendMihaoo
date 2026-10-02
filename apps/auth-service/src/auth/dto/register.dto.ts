import { IsEmail, Matches, MinLength } from 'class-validator';

const LATIN_SPECIAL_PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*[!@#$%^&*()_+={}\[\]|;:'",.<>\/?~`\\-])[A-Za-z0-9!@#$%^&*()_+={}\[\]|;:'",.<>\/?~`\\-]+$/;

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(LATIN_SPECIAL_PASSWORD_REGEX, {
    message:
      'Password must contain only Latin letters, digits, and special ' +
      'characters, with at least one Latin letter and one special ' +
      'character.',
  })
  password: string;
}
