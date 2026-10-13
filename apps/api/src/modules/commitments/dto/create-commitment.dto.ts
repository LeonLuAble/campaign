import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommitmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  typeKey?: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  targetValue: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
