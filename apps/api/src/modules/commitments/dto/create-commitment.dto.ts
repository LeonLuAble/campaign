import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CommitmentDecision } from '../domain/commitment.entity.js';

const isNotTakingPart = (dto: CreateCommitmentDto) =>
  dto.decision === CommitmentDecision.NOT_TAKING_PART;

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
}
