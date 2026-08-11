import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DestinationType,
  PublicationStatus,
} from '../../generated/prisma/enums';
import { EmptyToNull, mediaPathPattern, slugPattern } from './catalog-fields';

export class CreateDestinationDto {
  @IsEnum(DestinationType) type!: DestinationType;
  @IsString() @Matches(slugPattern) @MaxLength(160) slug!: string;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @EmptyToNull() @IsString() description?: string | null;
  @IsOptional() @EmptyToNull() @Matches(mediaPathPattern) imageUrl?:
    string | null;
  @IsOptional() @EmptyToNull() @IsUUID() parentProvinceId?: string | null;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  displayOrder?: number;
  @IsOptional()
  @EmptyToNull()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  primarySourceUrl?: string | null;
  @IsOptional() @EmptyToNull() @IsString() @MaxLength(60) sourceType?:
    string | null;
  @IsOptional() @EmptyToNull() @IsString() notes?: string | null;
  @IsEnum(PublicationStatus) publicationStatus!: PublicationStatus;
}
