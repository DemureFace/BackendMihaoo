import { IsNotEmpty, IsString } from 'class-validator';

export class AmountBreakdownDto {
  // A raw amount, e.g. "5000€" or "5000" (symbol is ignored — always
  // treated as EUR).
  @IsString()
  @IsNotEmpty()
  amount: string;
}
