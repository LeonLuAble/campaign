import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class CreateMembershipDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  communityId?: string | null;
}
