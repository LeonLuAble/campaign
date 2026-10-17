import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CampaignEnglishTranslationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  treeDisplayName?: string | null;
}

export class CampaignTranslationsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignEnglishTranslationsDto)
  en?: CampaignEnglishTranslationsDto;
}
