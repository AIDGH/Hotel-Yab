import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @Matches(/^(?:(?:\+|00)?98|0)?9\d{9}$/)
  mobile!: string;
}
