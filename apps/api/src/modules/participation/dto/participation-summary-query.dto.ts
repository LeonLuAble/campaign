import { IsOptional, IsUUID } from 'class-validator';

export class ParticipationSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  communityId?: string;
}
