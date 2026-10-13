import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActivateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password?: string;
}
