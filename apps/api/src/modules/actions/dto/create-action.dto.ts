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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateActionDto {
  @IsUUID()
  participationId: string;

  @IsUUID()
  actionDefinitionId: string;

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
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
