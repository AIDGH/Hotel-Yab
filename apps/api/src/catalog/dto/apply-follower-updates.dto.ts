import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class FollowerUpdateDto {
  @IsUUID()
  notablePersonId!: string;

  @IsInt()
  @Min(0)
  followerCount!: number;

  @IsDateString()
  capturedAt!: string;
}

export class ApplyFollowerUpdatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FollowerUpdateDto)
  updates!: FollowerUpdateDto[];
}
