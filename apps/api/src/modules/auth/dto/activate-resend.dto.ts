import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActivateResendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}
