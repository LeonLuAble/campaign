import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCommitmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  typeKey?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  targetValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
