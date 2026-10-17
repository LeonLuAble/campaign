import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CampaignTranslationsDto } from './campaign-translations.dto.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(ISO_DATE)
  startsOn?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(ISO_DATE)
  endsOn?: string | null;

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
