import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserCredential } from '../domain/user-credential.entity.js';
import { IdentityType, UserIdentity } from '../domain/user-identity.entity.js';
import { User } from '../domain/user.entity.js';
import { IdentityAccountService } from './identity-account.service.js';

describe('IdentityAccountService', () => {
  let service: IdentityAccountService;

  const mockUserRepository = { findOne: vi.fn() };
  const mockIdentityRepository = { findOne: vi.fn() };
  const mockCredentialRepository = { findOne: vi.fn() };

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
});
