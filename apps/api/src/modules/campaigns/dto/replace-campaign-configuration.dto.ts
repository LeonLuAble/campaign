import { IsObject } from 'class-validator';

export class ReplaceCampaignConfigurationDto {
  @IsObject()
  settings: Record<string, unknown>;
}
