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
} from 'class-validator';
import { CommitmentDecision } from '../domain/commitment.entity.js';

const isNotTakingPart = (dto: CreateCommitmentDto) =>
  dto.decision === CommitmentDecision.NOT_TAKING_PART ||
  (dto.restOfCampaign === true && dto.decision === undefined);

export const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCommitmentDto {
  @IsOptional()
  @IsIn(Object.values(CommitmentDecision))
  decision?: CommitmentDecision;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  typeKey?: string;

  @ValidateIf((dto: CreateCommitmentDto) => !isNotTakingPart(dto))
  @IsInt()
  @Min(1)
  @Max(100_000)
  targetValue?: number;

  @ValidateIf((dto: CreateCommitmentDto) => !isNotTakingPart(dto))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  /** Period end date from GET /campaigns/:id/periods. Defaults to today's period. */
  @IsOptional()
  @Matches(PERIOD_KEY_PATTERN, { message: 'periodKey must be YYYY-MM-DD' })
  periodKey?: string;

  /** Not taking part in this period and every later open period. */
  @IsOptional()
  @IsBoolean()
  restOfCampaign?: boolean;
}
