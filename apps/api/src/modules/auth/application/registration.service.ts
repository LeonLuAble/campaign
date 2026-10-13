import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CredentialService,
  InvalidPhoneNumberError,
  WeakPasswordError,
} from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { UserTokenService } from '../../identity/application/user-token.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { UserTokenType } from '../../identity/domain/user-token.entity.js';
import {
  ActivationTokenInvalidException,
  IdentityAlreadyExistsException,
  InvalidIdentifierException,
  TokenExpiredException,
  WeakPasswordException,
} from './auth.exceptions.js';
import {
  channelForIdentityType,
  NOTIFICATION_SENDER,
  type NotificationSender,
} from './notification-sender.js';
import { generateOneTimeToken, hashOneTimeToken } from './one-time-token.js';

export interface RegisteredAccount {
  id: string;
  identifier: string;
  type: 'email' | 'mobile';
}

const DEFAULT_ACTIVATION_TTL_SECONDS = 86_400;

@Injectable()
export class RegistrationService {
  private readonly activationTtlSeconds: number;

  constructor(
    private readonly identityAccountService: IdentityAccountService,
    private readonly credentialService: CredentialService,
    private readonly userTokenService: UserTokenService,
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
  ) {
    this.activationTtlSeconds = Number(
      this.configService.get(
        'ACTIVATION_TOKEN_TTL_SECONDS',
        DEFAULT_ACTIVATION_TTL_SECONDS,
      ),
    );
  }

  async register(
    identifier: string,
    password: string,
  ): Promise<RegisteredAccount> {
    let passwordHash: string;
    try {
      passwordHash = await this.credentialService.setPassword(password);
    } catch (error) {
      if (error instanceof WeakPasswordError) {
        throw new WeakPasswordException(error.message);
      }
      throw error;
    }

    const type = this.credentialService.detectIdentifierType(identifier);
    let normalizedIdentifier: string;
    try {
      normalizedIdentifier =
        this.credentialService.normalizeIdentifier(identifier);
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        throw new InvalidIdentifierException('Invalid mobile number');
      }
      throw error;
    }

    const storedIdentifier = identifier.trim();

    let created;
    try {
      created = await this.identityAccountService.createLocalAccount({
        identifier: storedIdentifier,
        normalizedIdentifier,
        type: type as IdentityType,
        passwordHash,
      });
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        throw new IdentityAlreadyExistsException();
      }
      throw error;
    }

    await this.issueActivationToken(created.userId, storedIdentifier, type);

    return {
      id: created.userId,
      identifier: storedIdentifier,
      type,
    };
  }

  async activate(token: string): Promise<void> {
    const stored = await this.userTokenService.findByHash(
      hashOneTimeToken(token),
    );
    if (!stored || stored.type !== UserTokenType.ACTIVATION) {
      throw new ActivationTokenInvalidException();
    }

    const alreadyVerified =
      await this.identityAccountService.areAllIdentitiesVerified(stored.userId);

    if (stored.usedAt) {
      if (alreadyVerified) {
        return;
      }
      throw new ActivationTokenInvalidException();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException('Activation token has expired');
    }

    const consumed = await this.identityAccountService.consumeActivation(
      stored.id,
      stored.userId,
    );
    if (consumed) {
      return;
    }

    const verifiedAfterRace =
      await this.identityAccountService.areAllIdentitiesVerified(stored.userId);
    if (verifiedAfterRace) {
      return;
    }
    throw new ActivationTokenInvalidException();
  }

  async resendActivation(identifier: string): Promise<void> {
    const identity = await this.findIdentityQuietly(identifier);
    if (!identity || identity.isVerified || !identity.isActive) {
      await this.credentialService.verifyDummyPassword('resend-activation');
      return;
    }

    await this.issueActivationToken(
      identity.userId,
      identity.identifier,
      identity.type,
    );
  }

  private async issueActivationToken(
    userId: string,
    to: string,
    type: string,
  ): Promise<void> {
    const rawToken = generateOneTimeToken();
    await this.userTokenService.supersedeUnusedAndCreate({
      userId,
      type: UserTokenType.ACTIVATION,
      tokenHash: hashOneTimeToken(rawToken),
      expiresAt: new Date(Date.now() + this.activationTtlSeconds * 1000),
    });
    await this.notificationSender.send({
      channel: channelForIdentityType(type),
      to,
      template: 'activation',
      token: rawToken,
    });
  }

  private async findIdentityQuietly(identifier: string) {
    const type = this.credentialService.detectIdentifierType(identifier);
    try {
      const normalizedIdentifier =
        this.credentialService.normalizeIdentifier(identifier);
      return this.identityAccountService.findIdentity(
        type as IdentityType,
        normalizedIdentifier,
      );
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        return null;
      }
      throw error;
    }
  }
}
