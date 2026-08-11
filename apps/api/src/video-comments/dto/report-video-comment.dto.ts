import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommentReportReason } from '../../generated/prisma/enums';

export class ReportVideoCommentDto {
  @IsEnum(CommentReportReason)
  reason!: CommentReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
