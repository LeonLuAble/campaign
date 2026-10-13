import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMeasurementDefinitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  key?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourceUnit: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
