import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_LOCALES } from '../../localization/application/locale-catalog.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsIn([...SUPPORTED_LOCALES])
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
