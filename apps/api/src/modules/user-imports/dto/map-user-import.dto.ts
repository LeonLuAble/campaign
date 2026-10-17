import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UserImportMappingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mobile?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  communityId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  communityPath?: string;
}

export class MapUserImportDto {
  @ValidateNested()
  @Type(() => UserImportMappingDto)
  mapping: UserImportMappingDto;
}
