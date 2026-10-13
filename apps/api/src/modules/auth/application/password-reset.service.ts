import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CredentialService,
  InvalidPhoneNumberError,
  WeakPasswordError,
} from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { UserTokenService } from '../../identity/application/user-token.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { UserTokenType } from '../../identity/domain/user-token.entity.js';
import {
  ActivationTokenInvalidException,
  TokenExpiredException,
  WeakPasswordException,
} from './auth.exceptions.js';
import {
  channelForIdentityType,
  NOTIFICATION_SENDER,
  type NotificationSender,
} from './notification-sender.js';
import { generateOneTimeToken, hashOneTimeToken } from './one-time-token.js';

const DEFAULT_PASSWORD_RESET_TTL_SECONDS = 3_600;

@Injectable()
export class PasswordResetService {
  private readonly resetTtlSeconds: number;

  constructor(
    private readonly identityAccountService: IdentityAccountService,
    private readonly credentialService: CredentialService,
    private readonly userTokenService: UserTokenService,
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
  ) {
    this.resetTtlSeconds = Number(
      this.configService.get(
        'PASSWORD_RESET_TOKEN_TTL_SECONDS',
        DEFAULT_PASSWORD_RESET_TTL_SECONDS,
      ),
    );
  }

  async request(identifier: string): Promise<void> {
    const type = this.credentialService.detectIdentifierType(identifier);
    let normalizedIdentifier: string;

    try {
      normalizedIdentifier =
        this.credentialService.normalizeIdentifier(identifier);
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        await this.credentialService.verifyDummyPassword(identifier);
        return;
      }
      throw error;
    }

    const identity = await this.identityAccountService.findIdentity(
      type as IdentityType,
      normalizedIdentifier,
    );
    const eligible = Boolean(identity?.isActive);

    if (!eligible) {
      await this.credentialService.verifyDummyPassword(identifier);
      return;
    }

    const rawToken = generateOneTimeToken();
    await this.userTokenService.supersedeUnusedAndCreate({
      userId: identity!.userId,
      type: UserTokenType.PASSWORD_RESET,
      tokenHash: hashOneTimeToken(rawToken),
      expiresAt: new Date(Date.now() + this.resetTtlSeconds * 1000),
    });
    await this.notificationSender.send({
      channel: channelForIdentityType(identity!.type),
      to: identity!.identifier,
      template: 'password_reset',
      token: rawToken,
    });
  }

  async confirm(token: string, password: string): Promise<void> {
    let passwordHash: string;
    try {
      passwordHash = await this.credentialService.setPassword(password);
    } catch (error) {
      if (error instanceof WeakPasswordError) {
        throw new WeakPasswordException(error.message);
      }
      throw error;
    }

    const stored = await this.userTokenService.findByHash(
      hashOneTimeToken(token),
    );
    if (!stored || stored.type !== UserTokenType.PASSWORD_RESET) {
      throw new ActivationTokenInvalidException();
    }

    if (stored.usedAt) {
      throw new ActivationTokenInvalidException();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException('Password reset token has expired');
    }

    const completed = await this.identityAccountService.completePasswordReset(
      stored.userId,
      stored.id,
      passwordHash,
    );
    if (!completed) {
      throw new ActivationTokenInvalidException();
    }
  }
}
