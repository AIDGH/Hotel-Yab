import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NotablePersonCategory,
  PublicationStatus,
} from '../../generated/prisma/enums';
import {
  EmptyToNull,
  instagramPattern,
  mediaPathPattern,
  NormalizeInstagram,
  slugPattern,
} from './catalog-fields';

export class CreateNotablePersonDto {
  @Matches(slugPattern) @MaxLength(160) slug!: string;
  @IsString() @MinLength(1) @MaxLength(200) displayName!: string;
  @IsOptional()
  @EmptyToNull()
  @NormalizeInstagram()
  @Matches(instagramPattern)
  @MaxLength(30)
  instagramHandle?: string | null;
  @IsEnum(NotablePersonCategory) primaryCategory!: NotablePersonCategory;
  @IsOptional() @EmptyToNull() @IsString() @MaxLength(200) occupation?:
    string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) followerCount?: number;
  @IsOptional() @EmptyToNull() @IsString() biography?: string | null;
  @IsOptional() @EmptyToNull() @Matches(/^[A-Z]{2}$/) countryCode?:
    string | null;
  @IsOptional() @EmptyToNull() @Matches(mediaPathPattern) imageUrl?:
    string | null;
  @IsEnum(PublicationStatus) publicationStatus!: PublicationStatus;
}
