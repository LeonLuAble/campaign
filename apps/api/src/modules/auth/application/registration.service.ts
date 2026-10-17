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
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
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

    await this.issueActivationToken(
      created.userId,
      created.identityId,
      storedIdentifier,
      type,
    );

    return {
      id: created.userId,
      identifier: storedIdentifier,
      type,
    };
  }

  async activate(token: string, password?: string): Promise<void> {
    const stored = await this.userTokenService.findByHash(
      hashOneTimeToken(token),
    );
    if (!stored || stored.type !== UserTokenType.ACTIVATION) {
      throw new ActivationTokenInvalidException();
    }

    const alreadyVerified = stored.identityId
      ? await this.identityAccountService.isIdentityVerified(stored.identityId)
      : await this.identityAccountService.areAllIdentitiesVerified(
          stored.userId,
        );
    const existingHash = await this.identityAccountService.getPasswordHash(
      stored.userId,
    );

    if (stored.usedAt) {
      if (alreadyVerified && existingHash) {
        return;
      }
      if (alreadyVerified && password) {
        const passwordHash = await this.hashActivationPassword(
          password,
          existingHash,
        );
        if (passwordHash) {
          await this.identityAccountService.setPasswordIfMissing(
            stored.userId,
            passwordHash,
          );
        }
        return;
      }
      throw new ActivationTokenInvalidException();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException('Activation token has expired');
    }

    const passwordHash = await this.hashActivationPassword(
      password,
      existingHash,
    );

    const consumed = await this.identityAccountService.consumeActivation(
      stored.id,
      stored.userId,
      stored.identityId,
      passwordHash,
    );
    if (consumed) {
      return;
    }

    const verifiedAfterRace = stored.identityId
      ? await this.identityAccountService.isIdentityVerified(stored.identityId)
      : await this.identityAccountService.areAllIdentitiesVerified(
          stored.userId,
        );
    if (verifiedAfterRace) {
      if (passwordHash) {
        await this.identityAccountService.setPasswordIfMissing(
          stored.userId,
          passwordHash,
        );
      }
      return;
    }
    throw new ActivationTokenInvalidException();
  }

  async sendActivationInvitation(identifier: string): Promise<void> {
    await this.resendActivation(identifier);
  }

  /**
   * Issues an activation token for a known identity and returns the raw token
   * so callers (e.g. customer create) can share it once. When [notify] is true
   * (default), still notifies via the existing sender; the raw value is never
   * logged here. Pass notify=false for mobile-only one-time links (Q5).
   */
  async issueActivationTokenForIdentity(input: {
    userId: string;
    identityId: string;
    identifier: string;
    type: string;
    notify?: boolean;
  }): Promise<string> {
    return this.issueActivationToken(
      input.userId,
      input.identityId,
      input.identifier,
      input.type,
      input.notify !== false,
    );
  }

  /** Notice for an already-active user who was added to a customer. */
  async sendCustomerAddedNotice(input: {
    userId: string;
    email: string;
    customerName: string;
    locale?: string | null;
  }): Promise<void> {
    const profile = await this.identityAccountService.getProfile(input.userId);
    await this.notificationSender.send({
      channel: 'email',
      to: input.email,
      template: 'customer_added',
      locale: input.locale ?? profile?.locale ?? undefined,
      payload: { customerName: input.customerName },
    });
  }

  async resendActivation(identifier: string): Promise<void> {
    const identity = await this.findIdentityQuietly(identifier);
    if (!identity || identity.isVerified || !identity.isActive) {
      await this.credentialService.verifyDummyPassword('resend-activation');
      return;
    }

    await this.issueActivationToken(
      identity.userId,
      identity.identityId,
      identity.identifier,
      identity.type,
    );
  }

  private async issueActivationToken(
    userId: string,
    identityId: string,
    to: string,
    type: string,
    notify = true,
  ): Promise<string> {
    const rawToken = generateOneTimeToken();
    await this.userTokenService.supersedeUnusedAndCreate({
      userId,
      identityId,
      type: UserTokenType.ACTIVATION,
      tokenHash: hashOneTimeToken(rawToken),
      expiresAt: new Date(Date.now() + this.activationTtlSeconds * 1000),
    });
    if (notify) {
      const profile = await this.identityAccountService.getProfile(userId);
      await this.notificationSender.send({
        channel: channelForIdentityType(type),
        to,
        template: 'activation',
        token: rawToken,
        locale: profile?.locale ?? undefined,
      });
    }
    return rawToken;
  }

  private async hashActivationPassword(
    password: string | undefined,
    existingHash: string | null,
  ): Promise<string | null> {
    if (existingHash) {
      return null;
    }
    if (!password) {
      throw new InvalidRequestException(
        'Password is required to activate this account',
      );
    }
    try {
      return await this.credentialService.setPassword(password);
    } catch (error) {
      if (error instanceof WeakPasswordError) {
        throw new WeakPasswordException(error.message);
      }
      throw error;
    }
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
