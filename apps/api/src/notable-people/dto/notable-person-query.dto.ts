import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotablePersonCategory } from '../../generated/prisma/enums';

export class NotablePersonQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  query?: string;

  @IsOptional()
  @IsEnum(NotablePersonCategory)
  category?: NotablePersonCategory;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  countryCode?: string;
}
