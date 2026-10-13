import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { RefreshToken } from '../domain/refresh-token.entity.js';
import { UserCredential } from '../domain/user-credential.entity.js';
import { IdentityType, UserIdentity } from '../domain/user-identity.entity.js';
import {
  SocialProvider,
  UserSocialIdentity,
} from '../domain/user-social-identity.entity.js';
import { UserToken } from '../domain/user-token.entity.js';
import { User } from '../domain/user.entity.js';

export class IdentityAlreadyExistsError extends Error {
  constructor() {
    super('Identity already exists');
    this.name = 'IdentityAlreadyExistsError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
}

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

export interface IdentityRecord {
  userId: string;
  identityId: string;
  type: IdentityType;
  identifier: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface CreateLocalAccountInput {
  identifier: string;
  normalizedIdentifier: string;
  type: IdentityType;
  passwordHash: string;
}

export interface CreatedLocalAccount {
  userId: string;
  identityId: string;
}

export interface ResolveSocialAccountInput {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  normalizedEmail: string | null;
}

export interface ResolvedSocialAccount {
  userId: string;
  isActive: boolean;
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
    private readonly dataSource: DataSource,
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

  async findIdentity(
    type: IdentityType,
    normalizedIdentifier: string,
  ): Promise<IdentityRecord | null> {
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
      identityId: identity.id,
      type: identity.type,
      identifier: identity.identifier,
      isVerified: identity.is_verified,
      isActive: identity.user.is_active,
    };
  }

  async createLocalAccount(
    input: CreateLocalAccountInput,
  ): Promise<CreatedLocalAccount> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const identityRepository = manager.getRepository(UserIdentity);
        const credentialRepository = manager.getRepository(UserCredential);

        const user = await userRepository.save(
          userRepository.create({
            is_active: true,
          }),
        );

        const identity = await identityRepository.save(
          identityRepository.create({
            user_id: user.id,
            type: input.type,
            identifier: input.identifier,
            normalized_identifier: input.normalizedIdentifier,
            is_verified: false,
            verified_at: null,
          }),
        );

        await credentialRepository.save(
          credentialRepository.create({
            user_id: user.id,
            password_hash: input.passwordHash,
          }),
        );

        return { userId: user.id, identityId: identity.id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new IdentityAlreadyExistsError();
      }
      throw error;
    }
  }

  async areAllIdentitiesVerified(userId: string): Promise<boolean> {
    const identities = await this.userIdentityRepository.find({
      where: { user_id: userId },
    });
    return (
      identities.length > 0 &&
      identities.every((identity) => identity.is_verified)
    );
  }

  async isIdentityVerified(identityId: string): Promise<boolean> {
    const identity = await this.userIdentityRepository.findOne({
      where: { id: identityId },
    });
    return identity?.is_verified === true;
  }

  async consumeActivation(
    tokenId: string,
    userId: string,
    identityId: string | null,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(UserToken);
      const identityRepository = manager.getRepository(UserIdentity);

      const used = await tokenRepository.update(
        { id: tokenId, used_at: IsNull() },
        { used_at: new Date() },
      );
      if ((used.affected ?? 0) === 0) {
        return false;
      }

      if (identityId) {
        await identityRepository.update(
          { id: identityId, user_id: userId, is_verified: false },
          { is_verified: true, verified_at: new Date() },
        );
      }

      return true;
    });
  }

  async resolveSocialAccount(
    input: ResolveSocialAccountInput,
  ): Promise<ResolvedSocialAccount> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const userRepository = manager.getRepository(User);
          const identityRepository = manager.getRepository(UserIdentity);
          const socialRepository = manager.getRepository(UserSocialIdentity);

          const existingSocial = await socialRepository.findOne({
            where: {
              provider: input.provider,
              provider_subject: input.subject,
            },
            relations: ['user'],
          });
          if (existingSocial?.user) {
            existingSocial.last_used_at = new Date();
            if (input.email) {
              existingSocial.provider_email = input.email;
            }
            await socialRepository.save(existingSocial);
            return {
              userId: existingSocial.user.id,
              isActive: existingSocial.user.is_active,
            };
          }

          if (input.emailVerified && input.normalizedEmail) {
            const verifiedEmail = await identityRepository.findOne({
              where: {
                type: IdentityType.EMAIL,
                normalized_identifier: input.normalizedEmail,
                is_verified: true,
              },
              relations: ['user'],
            });
            if (verifiedEmail?.user) {
              await socialRepository.save(
                socialRepository.create({
                  user_id: verifiedEmail.user.id,
                  provider: input.provider,
                  provider_subject: input.subject,
                  provider_email: input.email,
                  last_used_at: new Date(),
                }),
              );
              return {
                userId: verifiedEmail.user.id,
                isActive: verifiedEmail.user.is_active,
              };
            }
          }

          const user = await userRepository.save(
            userRepository.create({ is_active: true }),
          );

          await socialRepository.save(
            socialRepository.create({
              user_id: user.id,
              provider: input.provider,
              provider_subject: input.subject,
              provider_email: input.email,
              last_used_at: new Date(),
            }),
          );

          if (input.email && input.normalizedEmail) {
            const collidingEmail = await identityRepository.findOne({
              where: {
                type: IdentityType.EMAIL,
                normalized_identifier: input.normalizedEmail,
              },
            });
            if (!collidingEmail) {
              await identityRepository.save(
                identityRepository.create({
                  user_id: user.id,
                  type: IdentityType.EMAIL,
                  identifier: input.email,
                  normalized_identifier: input.normalizedEmail,
                  is_verified: input.emailVerified,
                  verified_at: input.emailVerified ? new Date() : null,
                }),
              );
            }
          }

          return { userId: user.id, isActive: true };
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to resolve social account');
  }

  async completePasswordReset(
    userId: string,
    tokenId: string,
    passwordHash: string,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(UserToken);
      const credentialRepository = manager.getRepository(UserCredential);
      const refreshTokenRepository = manager.getRepository(RefreshToken);

      const used = await tokenRepository.update(
        { id: tokenId, used_at: IsNull() },
        { used_at: new Date() },
      );
      if ((used.affected ?? 0) === 0) {
        return false;
      }

      const credential = await credentialRepository.findOne({
        where: { user_id: userId },
      });
      if (credential) {
        credential.password_hash = passwordHash;
        await credentialRepository.save(credential);
      } else {
        await credentialRepository.save(
          credentialRepository.create({
            user_id: userId,
            password_hash: passwordHash,
          }),
        );
      }

      await refreshTokenRepository.update(
        {
          user_id: userId,
          revoked_at: IsNull(),
        },
        {
          revoked_at: new Date(),
          revocation_reason: 'PASSWORD_RESET',
        },
      );

      return true;
    });
  }
}
