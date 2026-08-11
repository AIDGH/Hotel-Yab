import { OmitType } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RequestRegistrationOtpDto extends OmitType(RegisterDto, [
  'code',
] as const) {}
