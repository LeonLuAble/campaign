import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MilestoneMetric } from '../domain/milestone.entity.js';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

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
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
