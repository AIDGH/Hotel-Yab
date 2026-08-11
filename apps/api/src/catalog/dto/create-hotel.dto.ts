import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PublicationStatus } from '../../generated/prisma/enums';
import { EmptyToNull, mediaPathPattern, slugPattern } from './catalog-fields';

export class CreateHotelDto {
  @Matches(slugPattern) @MaxLength(160) slug!: string;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @EmptyToNull() @IsString() description?: string | null;
  @Matches(/^[A-Z]{2}$/) countryCode!: string;
  @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @IsOptional() @EmptyToNull() @IsString() address?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional()
  @EmptyToNull()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  websiteUrl?: string | null;
  @IsOptional() @EmptyToNull() @Matches(mediaPathPattern) imageUrl?:
    string | null;
  @IsOptional() @EmptyToNull() @Matches(mediaPathPattern) logoUrl?:
    string | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  starRating?: number;
  @IsEnum(PublicationStatus) publicationStatus!: PublicationStatus;
}
