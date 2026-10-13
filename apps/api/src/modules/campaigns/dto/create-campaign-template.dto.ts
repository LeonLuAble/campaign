import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCampaignTemplateDto {
  @IsUUID()
  customerId: string;

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
  @MaxLength(255)
  description?: string;
}
