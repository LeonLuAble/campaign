import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../application/auth.service.js';
import { PasswordResetService } from '../application/password-reset.service.js';
import { RegistrationService } from '../application/registration.service.js';
import { TokenService } from '../application/token.service.js';
import { ActivateResendDto } from '../dto/activate-resend.dto.js';
import { ActivateDto } from '../dto/activate.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { LogoutDto } from '../dto/logout.dto.js';
import { PasswordResetConfirmDto } from '../dto/password-reset-confirm.dto.js';
import { PasswordResetRequestDto } from '../dto/password-reset-request.dto.js';
import { RefreshTokenDto } from '../dto/refresh.dto.js';
import { RegisterDto } from '../dto/register.dto.js';
import { SocialLoginDto } from '../dto/social-login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly registrationService: RegistrationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  // TODO: add registration rate limiting.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.registrationService.register(
      registerDto.identifier,
      registerDto.password,
    );
  }

  // TODO: add activation rate limiting.
  @Post('activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  activate(@Body() activateDto: ActivateDto) {
    return this.registrationService.activate(activateDto.token);
  }

  // TODO: add activation resend rate limiting.
  @Post('activate/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendActivation(@Body() resendDto: ActivateResendDto) {
    await this.registrationService.resendActivation(resendDto.identifier);
    return { accepted: true };
  }

  // TODO: add password-reset request rate limiting.
  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() requestDto: PasswordResetRequestDto) {
    await this.passwordResetService.request(requestDto.identifier);
    return { accepted: true };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmPasswordReset(@Body() confirmDto: PasswordResetConfirmDto) {
    return this.passwordResetService.confirm(
      confirmDto.token,
      confirmDto.password,
    );
  }

  // TODO: add login rate limiting to reduce credential stuffing.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.identifier, loginDto.password);
  }

  // TODO: add social login rate limiting.
  @Post('social')
  @HttpCode(HttpStatus.OK)
  socialLogin(@Body() socialDto: SocialLoginDto) {
    return this.authService.socialLogin(socialDto.provider, socialDto.idToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.tokenService.rotateRefreshToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(
      logoutDto.refreshToken,
      logoutDto.revokeFamily === true,
    );
  }
}
