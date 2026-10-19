import { Type } from 'class-transformer';
import {
  IsBoolean,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MilestoneMetric } from '../domain/milestone.entity.js';
import { ISO_DATE_PATTERN } from './create-milestone.dto.js';
import { MilestoneTranslationsDto } from './milestone-translations.dto.js';

/**
 * `null` clears a nullable field. Clearing the goal needs `metric`,
 * `thresholdValue` and `unit` all set to null.
 */
export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf((dto: UpdateMilestoneDto) => dto.dueOn != null)
  @Matches(ISO_DATE_PATTERN, { message: 'dueOn must be an ISO date (YYYY-MM-DD)' })
  dueOn?: string | null;

  @ValidateIf((dto: UpdateMilestoneDto) => dto.metric != null)
  @IsIn(Object.values(MilestoneMetric))
  metric?: MilestoneMetric | null;

  @ValidateIf((dto: UpdateMilestoneDto) => dto.thresholdValue != null)
  @IsInt()
  @Min(1)
  @Max(100_000)
  thresholdValue?: number | null;

  @ValidateIf((dto: UpdateMilestoneDto) => dto.unit != null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MilestoneTranslationsDto)
  translations?: MilestoneTranslationsDto;
}
