import { IsEmail, Matches, MinLength } from 'class-validator';

const HEBREW_SPECIAL_PASSWORD_REGEX =
  /^(?=.*[א-ת])(?=.*[!@#$%^&*()_+={}\[\]|;:'",.<>\/?~`\\-])[א-ת!@#$%^&*()_+={}\[\]|;:'",.<>\/?~`\\-]+$/;

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(HEBREW_SPECIAL_PASSWORD_REGEX, {
    message:
      'Password must contain only Hebrew letters and special characters, ' +
      'with at least one Hebrew letter and one special character. ' +
      'Latin letters and digits are not allowed.',
  })
  password: string;
}
