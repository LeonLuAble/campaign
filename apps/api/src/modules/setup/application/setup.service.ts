import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CredentialService,
  WeakPasswordError,
} from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
  PlatformAdminAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import {
  IdentityAlreadyExistsException,
  WeakPasswordException,
} from '../../auth/application/auth.exceptions.js';
import { TokenPair, TokenService } from '../../auth/application/token.service.js';
import {
  InvalidSetupKeyException,
  SetupNotAvailableException,
} from './setup.exceptions.js';
import {
  isSetupKeyConfigured,
  timingSafeEqualString,
} from './setup-key.js';

export interface SetupStatus {
  setupRequired: boolean;
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);
  /** Once true, status always reports setupRequired=false without hitting the DB. */
  private platformAdminExistsCached = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly identityAccountService: IdentityAccountService,
    private readonly credentialService: CredentialService,
    private readonly tokenService: TokenService,
  ) {}

  private configuredSetupKey(): string | undefined {
    return (
      this.configService.get<string | undefined>('setup.key') ??
      this.configService.get<string | undefined>('SETUP_KEY')
    );
  }

  /** Clears the in-memory admin-exists cache. Used by tests after wiping identity data. */
  resetPlatformAdminCache(): void {
    this.platformAdminExistsCached = false;
  }

  async getStatus(): Promise<SetupStatus> {
    if (this.platformAdminExistsCached) {
      return { setupRequired: false };
    }

    const setupKey = this.configuredSetupKey();
    if (!isSetupKeyConfigured(setupKey)) {
      return { setupRequired: false };
    }

    const hasAdmin = await this.identityAccountService.hasPlatformAdmin();
    if (hasAdmin) {
      this.platformAdminExistsCached = true;
      return { setupRequired: false };
    }

    return { setupRequired: true };
  }

  async createAdmin(input: {
    setupKey: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<TokenPair> {
    const configuredKey = this.configuredSetupKey();

    if (!isSetupKeyConfigured(configuredKey)) {
      this.logger.warn({
        msg: 'setup_admin_attempt',
        outcome: 'unavailable',
        reason: 'setup_key_unset',
      });
      throw new SetupNotAvailableException();
    }

    if (!timingSafeEqualString(configuredKey!, input.setupKey)) {
      this.logger.warn({
        msg: 'setup_admin_attempt',
        outcome: 'invalid_key',
      });
      throw new InvalidSetupKeyException();
    }

    if (this.platformAdminExistsCached) {
      this.logger.warn({
        msg: 'setup_admin_attempt',
        outcome: 'unavailable',
        reason: 'admin_exists_cached',
      });
      throw new SetupNotAvailableException();
    }

    let passwordHash: string;
    try {
      passwordHash = await this.credentialService.setPassword(input.password);
    } catch (error) {
      if (error instanceof WeakPasswordError) {
        this.logger.warn({
          msg: 'setup_admin_attempt',
          outcome: 'weak_password',
        });
        throw new WeakPasswordException(error.message);
      }
      throw error;
    }

    const normalizedEmail = this.credentialService.normalizeEmail(input.email);

    try {
      const created = await this.identityAccountService.createFirstPlatformAdmin(
        {
          email: input.email,
          normalizedEmail,
          passwordHash,
          displayName: input.displayName,
        },
      );

      this.platformAdminExistsCached = true;
      this.logger.log({
        msg: 'setup_admin_attempt',
        outcome: 'success',
        userId: created.userId,
      });

      return this.tokenService.createRefreshToken(created.userId);
    } catch (error) {
      if (error instanceof PlatformAdminAlreadyExistsError) {
        this.platformAdminExistsCached = true;
        this.logger.warn({
          msg: 'setup_admin_attempt',
          outcome: 'unavailable',
          reason: 'admin_exists',
        });
        throw new SetupNotAvailableException();
      }
      if (error instanceof IdentityAlreadyExistsError) {
        this.logger.warn({
          msg: 'setup_admin_attempt',
          outcome: 'identity_exists',
        });
        throw new IdentityAlreadyExistsException();
      }
      throw error;
    }
  }
}
