import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotablePersonCategory } from '../../generated/prisma/enums';

export class NotablePersonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'athlete', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  query?: string;

  @ApiPropertyOptional({ enum: NotablePersonCategory, example: 'ATHLETE' })
  @IsOptional()
  @IsEnum(NotablePersonCategory)
  category?: NotablePersonCategory;

  @ApiPropertyOptional({ example: 'US', minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({
    enum: ['FOLLOWERS_DESC', 'NAME_ASC', 'HOTEL_COUNT_DESC'],
    default: 'FOLLOWERS_DESC',
  })
  @IsOptional()
  @IsIn(['FOLLOWERS_DESC', 'NAME_ASC', 'HOTEL_COUNT_DESC'])
  sort?: 'FOLLOWERS_DESC' | 'NAME_ASC' | 'HOTEL_COUNT_DESC';
}
