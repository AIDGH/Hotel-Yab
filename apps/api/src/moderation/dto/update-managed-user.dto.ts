import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const normalizeIdentifier = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim().replace(/^@/, '').toLowerCase()
    : value;

export class UpdateManagedUserDto {
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[A-Za-z])[A-Za-z0-9._]+$/)
  @MinLength(3)
  @MaxLength(30)
  @Transform(normalizeIdentifier)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(emptyToNull)
  @Transform(trim)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(emptyToNull)
  @Transform(trim)
  lastName?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(emptyToNull)
  @Transform(normalizeIdentifier)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9._]+$/)
  @MaxLength(31)
  @Transform(emptyToNull)
  @Transform(normalizeIdentifier)
  instagramHandle?: string | null;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
