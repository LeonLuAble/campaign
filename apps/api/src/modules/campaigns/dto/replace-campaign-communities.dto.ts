import { IsArray, IsUUID } from 'class-validator';

export class ReplaceCampaignCommunitiesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  communityIds: string[];
}
