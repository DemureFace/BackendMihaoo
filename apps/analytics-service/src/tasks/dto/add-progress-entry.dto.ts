import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

// One journal entry: SP actually credited on a given date. There's no
// update/delete counterpart — the journal is append-only, so a correction
// is a new entry (with a note explaining it), never an edit of an old one.
export class AddProgressEntryDto {
  @IsDateString()
  date: string;

  @IsNumber()
  storyPoints: number;

  @IsOptional()
  @IsString()
  note?: string;
}
