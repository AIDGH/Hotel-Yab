import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertHotelReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ required: false, minLength: 3, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  body?: string;
}
