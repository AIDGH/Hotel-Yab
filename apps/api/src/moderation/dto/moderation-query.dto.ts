import { IsEnum, IsOptional } from 'class-validator';
import { ContentModerationStatus } from '../../generated/prisma/enums';

export class ModerationQueryDto {
  @IsOptional()
  @IsEnum(ContentModerationStatus)
  status: ContentModerationStatus = ContentModerationStatus.PENDING;
}
