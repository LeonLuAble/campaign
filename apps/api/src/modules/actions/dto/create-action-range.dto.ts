import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrivacyLevel } from '../domain/action.entity.js';

export const MAX_RANGE_DAYS = 92;

export class CreateActionRangeDto {
  @IsUUID()
  actionDefinitionId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startOn: string;

  @IsInt()
  @Min(1)
  @Max(MAX_RANGE_DAYS)
  days: number;

  @IsInt()
  @Min(1)
  @Max(10_000)
  quantityPerDay: number;

  @IsOptional()
  @IsIn(Object.values(PrivacyLevel))
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
