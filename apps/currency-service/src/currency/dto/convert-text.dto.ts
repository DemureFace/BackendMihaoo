import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { currencyConfig } from '../config/currency.config';

const SITE_NAMES = Object.keys(currencyConfig.siteLocales);

export class ConvertTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsIn(SITE_NAMES)
  site: string;
}
