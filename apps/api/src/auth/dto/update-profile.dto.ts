import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function emptyToNull({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && value.trim() === '' ? null : value;
}

function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[A-Za-z])[A-Za-z0-9._]+$/)
  @MinLength(3)
  @MaxLength(30)
  @Transform(trimText)
  username?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(emptyToNull)
  @Transform(trimText)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(emptyToNull)
  @Transform(trimText)
  lastName?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(emptyToNull)
  @Transform(normalizeEmail)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9._]+$/)
  @MaxLength(31)
  @Transform(emptyToNull)
  instagramHandle?: string | null;
}
