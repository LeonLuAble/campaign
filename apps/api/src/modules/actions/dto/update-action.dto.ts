import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrivacyLevel } from '../domain/action.entity.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateActionDto {
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  occurredOn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity?: number;

  @IsOptional()
  @IsIn(Object.values(PrivacyLevel))
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
