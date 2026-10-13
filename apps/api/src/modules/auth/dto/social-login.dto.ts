import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';

export class SocialLoginDto {
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  idToken: string;
}
