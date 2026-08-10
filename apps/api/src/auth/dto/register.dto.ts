import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

export class RegisterDto {
  @IsString()
  @Matches(/^(?:(?:\+|00)?98|0)?9\d{9}$/)
  mobile!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @Matches(/^(?=.*[A-Za-z])[A-Za-z0-9._]+$/)
  @MinLength(3)
  @MaxLength(30)
  @Transform(trimText)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(trimText)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(trimText)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(emptyToUndefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9._]+$/)
  @MaxLength(31)
  @Transform(emptyToUndefined)
  instagramHandle?: string;
}
