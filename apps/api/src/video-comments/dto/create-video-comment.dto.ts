import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVideoCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
