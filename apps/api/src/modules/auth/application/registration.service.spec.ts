import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  TokenExpiredException,
  WeakPasswordException,
} from './auth.exceptions.js';
import { NOTIFICATION_SENDER } from './notification-sender.js';
import { hashOneTimeToken } from './one-time-token.js';
import { RegistrationService } from './registration.service.js';

describe('RegistrationService', () => {
  let service: RegistrationService;

  const mockIdentityAccountService = {
    createLocalAccount: vi.fn(),
    findIdentity: vi.fn(),
    areAllIdentitiesVerified: vi.fn(),
    isIdentityVerified: vi.fn(),
    consumeActivation: vi.fn(),
    getPasswordHash: vi.fn(),
    setPasswordIfMissing: vi.fn(),
    getProfile: vi.fn(),
  };

  const mockCredentialService = {
    setPassword: vi.fn(),
    detectIdentifierType: vi.fn(),
    normalizeIdentifier: vi.fn(),
    verifyDummyPassword: vi.fn(),
  };

  const mockUserTokenService = {
    findByHash: vi.fn(),
    supersedeUnusedAndCreate: vi.fn(),
  };

  const mockNotificationSender = {
    send: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'ACTIVATION_TOKEN_TTL_SECONDS') {
        return 86_400;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    mockCredentialService.setPassword.mockResolvedValue('hashed');
    mockCredentialService.detectIdentifierType.mockReturnValue('email');
    mockCredentialService.normalizeIdentifier.mockReturnValue(
      'test@example.com',
    );
    mockIdentityAccountService.createLocalAccount.mockResolvedValue({
      userId: 'user-id',
      identityId: 'identity-id',
    });
    mockIdentityAccountService.getPasswordHash.mockResolvedValue('hashed');
    mockIdentityAccountService.getProfile.mockResolvedValue({
      locale: 'en',
    });
    mockUserTokenService.supersedeUnusedAndCreate.mockResolvedValue({
      id: 'token-id',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        {
          provide: IdentityAccountService,
          useValue: mockIdentityAccountService,
        },
        { provide: CredentialService, useValue: mockCredentialService },
        { provide: UserTokenService, useValue: mockUserTokenService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NOTIFICATION_SENDER, useValue: mockNotificationSender },
      ],
    }).compile();

    service = module.get(RegistrationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('creates an unverified account and sends an activation token', async () => {
      const result = await service.register('TEST@example.com', 'password123');

      expect(result).toEqual({
        id: 'user-id',
        identifier: 'TEST@example.com',
        type: 'email',
      });
      expect(
        mockIdentityAccountService.createLocalAccount,
      ).toHaveBeenCalledWith({
        identifier: 'TEST@example.com',
        normalizedIdentifier: 'test@example.com',
        type: IdentityType.EMAIL,
        passwordHash: 'hashed',
      });
      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          identityId: 'identity-id',
          type: UserTokenType.ACTIVATION,
        }),
      );
      expect(mockNotificationSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          to: 'TEST@example.com',
          template: 'activation',
        }),
      );
      const sent = mockNotificationSender.send.mock.calls[0][0] as {
        token: string;
      };
      expect(sent.token).toMatch(/^[0-9a-f]{64}$/);
      const created = mockUserTokenService.supersedeUnusedAndCreate.mock
        .calls[0][0] as { tokenHash: string };
      expect(created.tokenHash).toBe(hashOneTimeToken(sent.token));
      expect(created.tokenHash).not.toBe(sent.token);
    });

    it('maps a duplicate identity to IDENTITY_ALREADY_EXISTS', async () => {
      mockIdentityAccountService.createLocalAccount.mockRejectedValue(
        new IdentityAlreadyExistsError(),
      );

      await expect(
        service.register('test@example.com', 'password123'),
      ).rejects.toBeInstanceOf(IdentityAlreadyExistsException);
      expect(mockNotificationSender.send).not.toHaveBeenCalled();
    });

    it('maps a weak password to WEAK_PASSWORD', async () => {
      mockCredentialService.setPassword.mockRejectedValue(
        new WeakPasswordError(),
      );

      await expect(
        service.register('test@example.com', 'short'),
      ).rejects.toBeInstanceOf(WeakPasswordException);
    });
  });

  describe('activate', () => {
    const stored = {
      id: 'token-id',
      userId: 'user-id',
      identityId: 'identity-id',
      type: UserTokenType.ACTIVATION,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    };

    it('consumes a valid unused token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(stored);
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(false);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hashed');
      mockIdentityAccountService.consumeActivation.mockResolvedValue(true);

      await service.activate('raw-token');

      expect(mockUserTokenService.findByHash).toHaveBeenCalledWith(
        hashOneTimeToken('raw-token'),
      );
      expect(mockIdentityAccountService.consumeActivation).toHaveBeenCalledWith(
        'token-id',
        'user-id',
        'identity-id',
        null,
      );
    });

    it('requires a password when the imported account has no credential', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(stored);
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(false);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue(null);

      await expect(service.activate('raw-token')).rejects.toBeInstanceOf(
        InvalidRequestException,
      );
      expect(
        mockIdentityAccountService.consumeActivation,
      ).not.toHaveBeenCalled();
    });

    it('sets a password while activating an imported account', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(stored);
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(false);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue(null);
      mockCredentialService.setPassword.mockResolvedValue('imported-hash');
      mockIdentityAccountService.consumeActivation.mockResolvedValue(true);

      await service.activate('raw-token', 'password123');

      expect(mockCredentialService.setPassword).toHaveBeenCalledWith(
        'password123',
      );
      expect(mockIdentityAccountService.consumeActivation).toHaveBeenCalledWith(
        'token-id',
        'user-id',
        'identity-id',
        'imported-hash',
      );
    });

    it('is idempotent when the token was already used and the identity is verified', async () => {
      mockUserTokenService.findByHash.mockResolvedValue({
        ...stored,
        usedAt: new Date(),
      });
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(true);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hashed');

      await expect(service.activate('raw-token')).resolves.toBeUndefined();
      expect(
        mockIdentityAccountService.consumeActivation,
      ).not.toHaveBeenCalled();
    });

    it('rejects reuse of a superseded unused-identity token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue({
        ...stored,
        usedAt: new Date(),
      });
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(false);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hashed');

      await expect(service.activate('raw-token')).rejects.toBeInstanceOf(
        ActivationTokenInvalidException,
      );
    });

    it('rejects an expired unused token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue({
        ...stored,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockIdentityAccountService.isIdentityVerified.mockResolvedValue(false);
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hashed');

      await expect(service.activate('raw-token')).rejects.toBeInstanceOf(
        TokenExpiredException,
      );
      expect(
        mockIdentityAccountService.consumeActivation,
      ).not.toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(null);

      await expect(service.activate('missing')).rejects.toBeInstanceOf(
        ActivationTokenInvalidException,
      );
    });
  });

  describe('resendActivation', () => {
    it('supersedes the unused token before creating a replacement', async () => {
      mockIdentityAccountService.findIdentity.mockResolvedValue({
        userId: 'user-id',
        identityId: 'identity-id',
        type: IdentityType.EMAIL,
        identifier: 'test@example.com',
        isVerified: false,
        isActive: true,
      });

      await service.resendActivation('test@example.com');

      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          identityId: 'identity-id',
          type: UserTokenType.ACTIVATION,
        }),
      );
      expect(mockNotificationSender.send).toHaveBeenCalled();
    });

    it('does not issue a token when the identity is already verified', async () => {
      mockIdentityAccountService.findIdentity.mockResolvedValue({
        userId: 'user-id',
        identityId: 'identity-id',
        type: IdentityType.EMAIL,
        identifier: 'test@example.com',
        isVerified: true,
        isActive: true,
      });

      await service.resendActivation('test@example.com');

      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).not.toHaveBeenCalled();
      expect(mockCredentialService.verifyDummyPassword).toHaveBeenCalled();
    });

    it('does not reveal a missing identity', async () => {
      mockCredentialService.normalizeIdentifier.mockImplementation(() => {
        throw new InvalidPhoneNumberError('bad');
      });
      mockCredentialService.detectIdentifierType.mockReturnValue('mobile');

      await service.resendActivation('not-a-phone');

      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).not.toHaveBeenCalled();
      expect(mockCredentialService.verifyDummyPassword).toHaveBeenCalled();
    });
  });
});
