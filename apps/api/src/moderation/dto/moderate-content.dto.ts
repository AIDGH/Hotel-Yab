import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentModerationStatus } from '../../generated/prisma/enums';

export class ModerateContentDto {
  @IsEnum(ContentModerationStatus)
  status!: ContentModerationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderationNote?: string;
}
