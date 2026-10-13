import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MilestoneMetric } from '../domain/milestone.entity.js';

export class CreateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  key?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(Object.values(MilestoneMetric))
  metric: MilestoneMetric;

  @IsInt()
  @Min(1)
  @Max(100_000)
  thresholdValue: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;
}
