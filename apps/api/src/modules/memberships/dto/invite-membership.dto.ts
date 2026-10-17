import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class InviteMembershipDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  communityId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  roleKeys?: string[];
}
