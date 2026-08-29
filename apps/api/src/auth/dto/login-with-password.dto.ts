import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { transformAuthDigits } from '../auth-normalization';

export class LoginWithPasswordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Transform(transformAuthDigits)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
