import { IsInt, IsString, MinLength } from 'class-validator';

export class AddCommentDto {
  @IsInt()
  authorId: number;

  @IsString()
  @MinLength(1)
  body: string;
}
