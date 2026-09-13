import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CrawlReviewItemStatus } from '../../generated/prisma/enums';

export class UpdateCrawlReviewItemDto {
  @IsEnum(CrawlReviewItemStatus)
  reviewStatus!: CrawlReviewItemStatus;

  @IsOptional()
  @IsUUID()
  hotelId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hotelName?: string | null;

  @IsArray()
  @IsUUID(undefined, { each: true })
  cityIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  provinceIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  finalTitle?: string | null;
}
