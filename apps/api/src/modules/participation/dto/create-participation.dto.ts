import { IsOptional, IsUUID } from 'class-validator';

export class CreateParticipationDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
