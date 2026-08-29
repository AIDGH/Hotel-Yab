import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { transformAuthDigits } from '../auth-normalization';

export class RequestLoginOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Transform(transformAuthDigits)
  identifier!: string;
}
