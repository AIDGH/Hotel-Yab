import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  identifier!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
