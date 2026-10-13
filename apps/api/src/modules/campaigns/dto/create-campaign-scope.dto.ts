import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCampaignScopeDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  templateId: string;

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
