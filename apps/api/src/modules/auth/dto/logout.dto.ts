import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsOptional()
  @IsBoolean()
  revokeFamily?: boolean;
}
