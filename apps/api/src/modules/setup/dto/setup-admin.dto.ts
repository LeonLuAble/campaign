import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetupAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  setupKey: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}
