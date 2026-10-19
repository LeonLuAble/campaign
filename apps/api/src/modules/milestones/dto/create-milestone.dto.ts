import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MilestoneMetric } from '../domain/milestone.entity.js';
import { MilestoneTranslationsDto } from './milestone-translations.dto.js';

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  key?: string;

  /** Primary (zh-Hans) name. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'dueOn must be an ISO date (YYYY-MM-DD)' })
  dueOn?: string;

  /** Goal fields are all set or all omitted. */
  @IsOptional()
  @IsIn(Object.values(MilestoneMetric))
  metric?: MilestoneMetric;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  thresholdValue?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MilestoneTranslationsDto)
  translations?: MilestoneTranslationsDto;
}
