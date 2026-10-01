import { IsString, MinLength } from 'class-validator';

// authorId is deliberately not a field here — the author is always the
// authenticated caller (see TasksService.resolveAuthor), never something
// the client can specify.
export class AddCommentDto {
  @IsString()
  @MinLength(1)
  body: string;
}
