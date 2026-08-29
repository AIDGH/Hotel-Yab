import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { transformAuthDigits } from '../auth-normalization';

export class VerifyLoginOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Transform(transformAuthDigits)
  identifier!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  @Transform(transformAuthDigits)
  code!: string;
}
