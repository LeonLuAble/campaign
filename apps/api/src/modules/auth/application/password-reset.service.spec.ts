import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { NOTIFICATION_SENDER } from './notification-sender.js';
import { hashOneTimeToken } from './one-time-token.js';
import { PasswordResetService } from './password-reset.service.js';

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const mockIdentityAccountService = {
    findIdentity: vi.fn(),
    completePasswordReset: vi.fn(),
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
      if (key === 'PASSWORD_RESET_TOKEN_TTL_SECONDS') {
        return 3_600;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    mockCredentialService.detectIdentifierType.mockReturnValue('email');
    mockCredentialService.normalizeIdentifier.mockReturnValue(
      'test@example.com',
    );
    mockCredentialService.setPassword.mockResolvedValue('new-hash');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
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

    service = module.get(PasswordResetService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request', () => {
    it('issues a reset token when the identity exists and is active', async () => {
      mockIdentityAccountService.findIdentity.mockResolvedValue({
        userId: 'user-id',
        identityId: 'identity-id',
        type: IdentityType.EMAIL,
        identifier: 'test@example.com',
        isVerified: true,
        isActive: true,
      });

      await service.request('test@example.com');

      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          type: UserTokenType.PASSWORD_RESET,
        }),
      );
      expect(mockNotificationSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'password_reset',
          to: 'test@example.com',
        }),
      );
    });

    it('uses dummy password work and sends nothing for an unknown identifier', async () => {
      mockIdentityAccountService.findIdentity.mockResolvedValue(null);

      await service.request('missing@example.com');

      expect(mockCredentialService.verifyDummyPassword).toHaveBeenCalledWith(
        'missing@example.com',
      );
      expect(
        mockUserTokenService.supersedeUnusedAndCreate,
      ).not.toHaveBeenCalled();
      expect(mockNotificationSender.send).not.toHaveBeenCalled();
    });

    it('uses dummy password work for an invalid mobile number', async () => {
      mockCredentialService.detectIdentifierType.mockReturnValue('mobile');
      mockCredentialService.normalizeIdentifier.mockImplementation(() => {
        throw new InvalidPhoneNumberError('bad');
      });

      await service.request('not-a-phone');

      expect(mockCredentialService.verifyDummyPassword).toHaveBeenCalled();
      expect(mockNotificationSender.send).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    const stored = {
      id: 'token-id',
      userId: 'user-id',
      type: UserTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    };

    it('sets the password, consumes the token, and revokes sessions', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(stored);
      mockIdentityAccountService.completePasswordReset.mockResolvedValue(true);

      await service.confirm('raw-token', 'newPassword1');

      expect(mockCredentialService.setPassword).toHaveBeenCalledWith(
        'newPassword1',
      );
      expect(
        mockIdentityAccountService.completePasswordReset,
      ).toHaveBeenCalledWith('user-id', 'token-id', 'new-hash');
    });

    it('rejects a used token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue({
        ...stored,
        usedAt: new Date(),
      });

      await expect(
        service.confirm('raw-token', 'newPassword1'),
      ).rejects.toBeInstanceOf(ActivationTokenInvalidException);
      expect(
        mockIdentityAccountService.completePasswordReset,
      ).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      mockUserTokenService.findByHash.mockResolvedValue({
        ...stored,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.confirm('raw-token', 'newPassword1'),
      ).rejects.toBeInstanceOf(TokenExpiredException);
    });

    it('rejects a weak password before consuming the token', async () => {
      mockCredentialService.setPassword.mockRejectedValue(
        new WeakPasswordError(),
      );

      await expect(
        service.confirm('raw-token', 'short'),
      ).rejects.toBeInstanceOf(WeakPasswordException);
      expect(mockUserTokenService.findByHash).not.toHaveBeenCalled();
    });

    it('hashes the presented token rather than storing it raw', async () => {
      mockUserTokenService.findByHash.mockResolvedValue(stored);
      mockIdentityAccountService.completePasswordReset.mockResolvedValue(true);

      await service.confirm('raw-token', 'newPassword1');

      expect(mockUserTokenService.findByHash).toHaveBeenCalledWith(
        hashOneTimeToken('raw-token'),
      );
    });
  });
});
