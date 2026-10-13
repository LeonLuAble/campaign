import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshToken } from '../domain/refresh-token.entity.js';
import { UserCredential } from '../domain/user-credential.entity.js';
import { IdentityType, UserIdentity } from '../domain/user-identity.entity.js';
import { UserToken } from '../domain/user-token.entity.js';
import { User } from '../domain/user.entity.js';
import { IdentityAccountService } from './identity-account.service.js';

describe('IdentityAccountService', () => {
  let service: IdentityAccountService;

  const mockUserRepository = { findOne: vi.fn() };
  const mockIdentityRepository = { findOne: vi.fn(), find: vi.fn() };
  const mockCredentialRepository = { findOne: vi.fn() };
  const mockDataSource = { transaction: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityAccountService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(UserIdentity),
          useValue: mockIdentityRepository,
        },
        {
          provide: getRepositoryToken(UserCredential),
          useValue: mockCredentialRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(IdentityAccountService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('finds a login candidate by type and normalized identifier', async () => {
    mockIdentityRepository.findOne.mockResolvedValue({
      is_verified: true,
      user: { id: 'user-id', is_active: true },
    });

    const candidate = await service.findLoginCandidate(
      IdentityType.EMAIL,
      'test@example.com',
    );

    expect(candidate).toEqual({
      userId: 'user-id',
      isActive: true,
      isVerified: true,
    });
    expect(mockIdentityRepository.findOne).toHaveBeenCalledWith({
      where: {
        type: IdentityType.EMAIL,
        normalized_identifier: 'test@example.com',
      },
      relations: ['user'],
    });
  });

  it('returns a profile without credential or identity hashes', async () => {
    mockUserRepository.findOne.mockResolvedValue({
      id: 'user-id',
      first_name: 'Test',
      last_name: 'User',
      display_name: 'Test User',
      locale: 'en',
      timezone: 'UTC',
      is_active: true,
      identities: [
        {
          id: 'identity-id',
          type: IdentityType.EMAIL,
          identifier: 'test@example.com',
          normalized_identifier: 'test@example.com',
          is_verified: true,
        },
      ],
    });

    const profile = await service.getProfile('user-id');

    expect(profile).toMatchObject({
      id: 'user-id',
      firstName: 'Test',
      identities: [
        {
          id: 'identity-id',
          type: 'email',
          identifier: 'test@example.com',
          isVerified: true,
        },
      ],
    });
    expect(JSON.stringify(profile)).not.toContain('normalized_identifier');
    expect(JSON.stringify(profile)).not.toContain('password_hash');
  });

  it('finds an identity record by type and normalized identifier', async () => {
    mockIdentityRepository.findOne.mockResolvedValue({
      id: 'identity-id',
      type: IdentityType.EMAIL,
      identifier: 'test@example.com',
      is_verified: false,
      user: { id: 'user-id', is_active: true },
    });

    await expect(
      service.findIdentity(IdentityType.EMAIL, 'test@example.com'),
    ).resolves.toEqual({
      userId: 'user-id',
      identityId: 'identity-id',
      type: IdentityType.EMAIL,
      identifier: 'test@example.com',
      isVerified: false,
      isActive: true,
    });
  });

  it('reports whether every identity for a user is verified', async () => {
    mockIdentityRepository.find.mockResolvedValue([
      { is_verified: true },
      { is_verified: false },
    ]);

    await expect(service.areAllIdentitiesVerified('user-id')).resolves.toBe(
      false,
    );
  });

  it('consumes an unused activation token and verifies identities', async () => {
    const tokenRepository = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const identityRepository = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockDataSource.transaction.mockImplementation(
      async (
        work: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        work({
          getRepository: (entity: unknown) => {
            if (entity === UserToken) {
              return tokenRepository;
            }
            if (entity === UserIdentity) {
              return identityRepository;
            }
            throw new Error('unexpected entity');
          },
        }),
    );

    await expect(
      service.consumeActivation('token-id', 'user-id'),
    ).resolves.toBe(true);
    expect(tokenRepository.update).toHaveBeenCalledWith(
      { id: 'token-id', used_at: IsNull() },
      { used_at: expect.any(Date) },
    );
    expect(identityRepository.update).toHaveBeenCalledWith(
      { user_id: 'user-id', is_verified: false },
      { is_verified: true, verified_at: expect.any(Date) },
    );
  });

  it('does not verify identities when the activation token was already used', async () => {
    const tokenRepository = {
      update: vi.fn().mockResolvedValue({ affected: 0 }),
    };
    const identityRepository = { update: vi.fn() };
    mockDataSource.transaction.mockImplementation(
      async (
        work: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        work({
          getRepository: (entity: unknown) => {
            if (entity === UserToken) {
              return tokenRepository;
            }
            if (entity === UserIdentity) {
              return identityRepository;
            }
            throw new Error('unexpected entity');
          },
        }),
    );

    await expect(
      service.consumeActivation('token-id', 'user-id'),
    ).resolves.toBe(false);
    expect(identityRepository.update).not.toHaveBeenCalled();
  });

  it('consumes the reset token, updates the password, and revokes refresh sessions', async () => {
    const tokenRepository = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const credential = { user_id: 'user-id', password_hash: 'old-hash' };
    const credentialRepository = {
      findOne: vi.fn().mockResolvedValue(credential),
      save: vi.fn(async (value: unknown) => value),
      create: vi.fn((value: unknown) => value),
    };
    const refreshTokenRepository = {
      update: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    mockDataSource.transaction.mockImplementation(
      async (
        work: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        work({
          getRepository: (entity: unknown) => {
            if (entity === UserToken) {
              return tokenRepository;
            }
            if (entity === UserCredential) {
              return credentialRepository;
            }
            if (entity === RefreshToken) {
              return refreshTokenRepository;
            }
            throw new Error('unexpected entity');
          },
        }),
    );

    await expect(
      service.completePasswordReset('user-id', 'token-id', 'new-hash'),
    ).resolves.toBe(true);
    expect(tokenRepository.update).toHaveBeenCalledWith(
      { id: 'token-id', used_at: IsNull() },
      { used_at: expect.any(Date) },
    );
    expect(credentialRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ password_hash: 'new-hash' }),
    );
    expect(refreshTokenRepository.update).toHaveBeenCalledWith(
      { user_id: 'user-id', revoked_at: IsNull() },
      {
        revoked_at: expect.any(Date),
        revocation_reason: 'PASSWORD_RESET',
      },
    );
  });

  it('does not rotate credentials when the reset token was already used', async () => {
    const tokenRepository = {
      update: vi.fn().mockResolvedValue({ affected: 0 }),
    };
    const credentialRepository = { findOne: vi.fn(), save: vi.fn() };
    const refreshTokenRepository = { update: vi.fn() };
    mockDataSource.transaction.mockImplementation(
      async (
        work: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => unknown,
      ) =>
        work({
          getRepository: (entity: unknown) => {
            if (entity === UserToken) {
              return tokenRepository;
            }
            if (entity === UserCredential) {
              return credentialRepository;
            }
            if (entity === RefreshToken) {
              return refreshTokenRepository;
            }
            throw new Error('unexpected entity');
          },
        }),
    );

    await expect(
      service.completePasswordReset('user-id', 'token-id', 'new-hash'),
    ).resolves.toBe(false);
    expect(credentialRepository.findOne).not.toHaveBeenCalled();
    expect(refreshTokenRepository.update).not.toHaveBeenCalled();
  });
});
