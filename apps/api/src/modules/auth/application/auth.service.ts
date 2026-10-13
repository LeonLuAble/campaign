import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from '../../identity/application/credential.service.js';
import { UserCredential } from '../../identity/domain/user-credential.entity.js';
import { UserIdentity } from '../../identity/domain/user-identity.entity.js';
import { User } from '../../identity/domain/user.entity.js';
import { InvalidCredentialsException } from './auth.exceptions.js';
import { TokenPair, TokenService } from './token.service.js';

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  locale: string | null;
  timezone: string | null;
  isActive: boolean;
  identities: Array<{
    id: string;
    type: string;
    identifier: string;
    isVerified: boolean;
  }>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly userIdentityRepository: Repository<UserIdentity>,
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
    private readonly credentialService: CredentialService,
    private readonly tokenService: TokenService,
  ) {}

  async login(identifier: string, password: string): Promise<TokenPair> {
    const normalizedIdentifier = this.normalizeLoginIdentifier(identifier);

    const userIdentity = await this.userIdentityRepository.findOne({
      where: { normalized_identifier: normalizedIdentifier },
      relations: ['user'],
    });

    if (
      !userIdentity ||
      !userIdentity.is_verified ||
      !userIdentity.user.is_active
    ) {
      throw new InvalidCredentialsException();
    }

    const credential = await this.userCredentialRepository.findOne({
      where: { user_id: userIdentity.user.id },
    });

    if (!credential) {
      throw new InvalidCredentialsException();
    }

    const isValidPassword = await this.credentialService.verifyPassword(
      credential.password_hash,
      password,
    );

    if (!isValidPassword) {
      throw new InvalidCredentialsException();
    }

    return this.tokenService.createRefreshToken(userIdentity.user.id);
  }

  async logout(refreshToken: string, revokeFamily = false): Promise<void> {
    const token = await this.tokenService.findByRawToken(refreshToken);
    if (!token) {
      return;
    }

    if (revokeFamily) {
      await this.tokenService.revokeFamilyTokens(
        token.family_id,
        'USER_LOGOUT',
      );
      return;
    }

    await this.tokenService.revokeRefreshToken(refreshToken, 'USER_LOGOUT');
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['identities'],
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      locale: user.locale,
      timezone: user.timezone,
      isActive: user.is_active,
      identities: user.identities.map((identity) => ({
        id: identity.id,
        type: identity.type,
        identifier: identity.identifier,
        isVerified: identity.is_verified,
      })),
    };
  }

  private normalizeLoginIdentifier(identifier: string): string {
    try {
      return this.credentialService.normalizeIdentifier(identifier);
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        throw new InvalidCredentialsException();
      }
      throw error;
    }
  }
}
