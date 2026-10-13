import { IsOptional, IsUUID } from 'class-validator';

export class ListImpactFactorsQuery {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
