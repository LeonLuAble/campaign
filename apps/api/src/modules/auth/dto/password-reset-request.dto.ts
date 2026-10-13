import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PasswordResetRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}
