import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateImpactFactorDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourceUnit: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  outcomeMetric: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  outcomeUnit: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Max(1_000_000_000)
  factorValue: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  source: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveFrom: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveTo?: string | null;
}
