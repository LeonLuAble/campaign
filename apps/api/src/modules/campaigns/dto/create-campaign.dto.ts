import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CampaignTranslationsDto } from './campaign-translations.dto.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCampaignDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  templateId: string;

  @IsUUID()
  scopeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone: string;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  startsOn?: string;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  endsOn?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  communityIds?: string[];

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignTranslationsDto)
  translations?: CampaignTranslationsDto;
}
