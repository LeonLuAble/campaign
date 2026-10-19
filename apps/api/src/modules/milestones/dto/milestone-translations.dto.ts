import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MilestoneEnglishTranslationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class MilestoneTranslationsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MilestoneEnglishTranslationsDto)
  en?: MilestoneEnglishTranslationsDto;
}
