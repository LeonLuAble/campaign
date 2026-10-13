import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;
}
