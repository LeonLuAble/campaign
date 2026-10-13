import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCredential } from '../domain/user-credential.entity.js';
import { IdentityType, UserIdentity } from '../domain/user-identity.entity.js';
import { User } from '../domain/user.entity.js';

export interface LoginCandidate {
  userId: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface PublicIdentity {
  id: string;
  type: string;
  identifier: string;
  isVerified: boolean;
}

export interface PublicUserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  locale: string | null;
  timezone: string | null;
  isActive: boolean;
  identities: PublicIdentity[];
}

@Injectable()
export class IdentityAccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly userIdentityRepository: Repository<UserIdentity>,
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
  ) {}

  async findLoginCandidate(
    type: IdentityType,
    normalizedIdentifier: string,
  ): Promise<LoginCandidate | null> {
    const identity = await this.userIdentityRepository.findOne({
      where: {
        type,
        normalized_identifier: normalizedIdentifier,
      },
      relations: ['user'],
    });

    if (!identity?.user) {
      return null;
    }

    return {
      userId: identity.user.id,
      isActive: identity.user.is_active,
      isVerified: identity.is_verified,
    };
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const credential = await this.userCredentialRepository.findOne({
      where: { user_id: userId },
    });
    return credential?.password_hash ?? null;
  }

  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user?.is_active === true;
  }

  async getProfile(userId: string): Promise<PublicUserProfile | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['identities'],
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      locale: user.locale,
      timezone: user.timezone,
      isActive: user.is_active,
      identities: (user.identities ?? []).map((identity) => ({
        id: identity.id,
        type: identity.type,
        identifier: identity.identifier,
        isVerified: identity.is_verified,
      })),
    };
  }
}
