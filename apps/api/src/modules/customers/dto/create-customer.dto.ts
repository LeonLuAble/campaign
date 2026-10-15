import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class InitialAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUUID()
  initialAdminUserId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialAdminDto)
  initialAdmin?: InitialAdminDto;
}
