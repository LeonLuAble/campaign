import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMembershipDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
