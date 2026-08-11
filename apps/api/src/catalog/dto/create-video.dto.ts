import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PublicationStatus,
  VerificationStatus,
} from '../../generated/prisma/enums';
import {
  EmptyToNull,
  instagramPattern,
  mediaPathPattern,
  NormalizeInstagram,
} from './catalog-fields';

export class CreateVideoDto {
  @IsString() @MinLength(1) @MaxLength(160) id!: string;
  @NormalizeInstagram()
  @Matches(instagramPattern)
  @MaxLength(30)
  instagramUsername!: string;
  @IsString() @MaxLength(30) platform!: string;
  @IsOptional() @EmptyToNull() @IsString() @MaxLength(40) personCategory?:
    string | null;
  @IsString() @MaxLength(40) contentType!: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  sourceUrl!: string;
  @IsString() @MinLength(1) @MaxLength(240) title!: string;
  @IsString() @MinLength(1) @MaxLength(200) placeName!: string;
  @IsString() @MaxLength(40) placeType!: string;
  @IsOptional() @EmptyToNull() @IsString() @MaxLength(20) publishedDate?:
    string | null;
  @IsOptional() @EmptyToNull() @IsString() captionSummary?: string | null;
  @IsString() @MaxLength(40) evidenceType!: string;
  @IsEnum(VerificationStatus) verificationStatus!: VerificationStatus;
  @IsOptional() @EmptyToNull() @IsString() notes?: string | null;
  @Matches(mediaPathPattern) mediaUrl!: string;
  @Matches(mediaPathPattern) thumbnailUrl!: string;
  @IsEnum(PublicationStatus) publicationStatus!: PublicationStatus;
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  destinationIds!: string[];
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  hotelIds?: string[];
}
