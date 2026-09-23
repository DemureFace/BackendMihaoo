import { IsString, MinLength } from 'class-validator';

export class GenerateIpContentDto {
  // Any text containing one or more "€X" / "X€" mentions to convert per
  // locale — e.g. a card's prize/description text.
  @IsString()
  @MinLength(1)
  text: string;
}
