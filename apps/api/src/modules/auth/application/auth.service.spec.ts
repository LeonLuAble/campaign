import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialService } from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { DUMMY_PASSWORD_HASH } from '../../identity/application/password-hashing.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { AuthService } from './auth.service.js';
import {
  InvalidCredentialsException,
  SocialTokenInvalidException,
} from './auth.exceptions.js';
import { SOCIAL_TOKEN_VERIFIER } from './social-token.verifier.js';
import { TokenService } from './token.service.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockIdentityAccountService = {
    findLoginCandidate: vi.fn(),
    getPasswordHash: vi.fn(),
    getProfile: vi.fn(),
    resolveSocialAccount: vi.fn(),
  };

  const mockCredentialService = {
    detectIdentifierType: vi.fn(),
    normalizeIdentifier: vi.fn(),
    normalizeEmail: vi.fn(),
    verifyPassword: vi.fn(),
    verifyDummyPassword: vi.fn(),
  };

  const mockTokenService = {
    createRefreshToken: vi.fn(),
  };

  const mockSocialTokenVerifier = {
    verify: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: IdentityAccountService,
          useValue: mockIdentityAccountService,
        },
        { provide: CredentialService, useValue: mockCredentialService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SOCIAL_TOKEN_VERIFIER, useValue: mockSocialTokenVerifier },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('looks up an email candidate by type and normalized identifier', async () => {
      mockCredentialService.detectIdentifierType.mockReturnValue('email');
      mockCredentialService.normalizeIdentifier.mockReturnValue(
        'test@example.com',
      );
      mockIdentityAccountService.findLoginCandidate.mockResolvedValue({
        userId: 'user-id',
        isActive: true,
        isVerified: true,
      });
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hash');
      mockCredentialService.verifyPassword.mockResolvedValue(true);
      mockTokenService.createRefreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      await service.login('TEST@EXAMPLE.COM', 'password123');

      expect(
        mockIdentityAccountService.findLoginCandidate,
      ).toHaveBeenCalledWith(IdentityType.EMAIL, 'test@example.com');
    });

    it('looks up a mobile candidate by type and normalized identifier', async () => {
      mockCredentialService.detectIdentifierType.mockReturnValue('mobile');
      mockCredentialService.normalizeIdentifier.mockReturnValue('+60123456789');
      mockIdentityAccountService.findLoginCandidate.mockResolvedValue({
        userId: 'user-id',
        isActive: true,
        isVerified: true,
      });
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('hash');
      mockCredentialService.verifyPassword.mockResolvedValue(true);
      mockTokenService.createRefreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      await service.login('+60123456789', 'password123');

      expect(
        mockIdentityAccountService.findLoginCandidate,
      ).toHaveBeenCalledWith(IdentityType.MOBILE, '+60123456789');
    });

    it.each([
      ['missing identity', null, null],
      [
        'unverified identity',
        { userId: 'user-id', isActive: true, isVerified: false },
        'hash',
      ],
      [
        'inactive user',
        { userId: 'user-id', isActive: false, isVerified: true },
        'hash',
      ],
      [
        'missing credential',
        { userId: 'user-id', isActive: true, isVerified: true },
        null,
      ],
    ])(
      'runs argon2 against the dummy hash when %s',
      async (_label, candidate, passwordHash) => {
        mockCredentialService.detectIdentifierType.mockReturnValue('email');
        mockCredentialService.normalizeIdentifier.mockReturnValue(
          'test@example.com',
        );
        mockIdentityAccountService.findLoginCandidate.mockResolvedValue(
          candidate,
        );
        mockIdentityAccountService.getPasswordHash.mockResolvedValue(
          passwordHash,
        );
        mockCredentialService.verifyPassword.mockResolvedValue(false);

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toBeInstanceOf(InvalidCredentialsException);

        expect(mockCredentialService.verifyPassword).toHaveBeenCalledWith(
          DUMMY_PASSWORD_HASH,
          'password123',
        );
        expect(mockTokenService.createRefreshToken).not.toHaveBeenCalled();
      },
    );

    it('verifies the real hash when the candidate is eligible', async () => {
      mockCredentialService.detectIdentifierType.mockReturnValue('email');
      mockCredentialService.normalizeIdentifier.mockReturnValue(
        'test@example.com',
      );
      mockIdentityAccountService.findLoginCandidate.mockResolvedValue({
        userId: 'user-id',
        isActive: true,
        isVerified: true,
      });
      mockIdentityAccountService.getPasswordHash.mockResolvedValue('real-hash');
      mockCredentialService.verifyPassword.mockResolvedValue(true);
      mockTokenService.createRefreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      await service.login('test@example.com', 'password123');

      expect(mockCredentialService.verifyPassword).toHaveBeenCalledWith(
        'real-hash',
        'password123',
      );
    });
  });

  describe('socialLogin', () => {
    beforeEach(() => {
      mockCredentialService.normalizeEmail.mockImplementation((email: string) =>
        email.toLowerCase(),
      );
      mockTokenService.createRefreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
    });

    it('issues a token pair for a verified social identity', async () => {
      mockSocialTokenVerifier.verify.mockResolvedValue({
        provider: SocialProvider.GOOGLE,
        subject: 'sub-1',
        email: 'User@Example.com',
        emailVerified: true,
      });
      mockIdentityAccountService.resolveSocialAccount.mockResolvedValue({
        userId: 'user-id',
        isActive: true,
      });

      await expect(
        service.socialLogin(SocialProvider.GOOGLE, 'id-token'),
      ).resolves.toEqual({
        accessToken: 'a',
        refreshToken: 'r',
      });

      expect(
        mockIdentityAccountService.resolveSocialAccount,
      ).toHaveBeenCalledWith({
        provider: SocialProvider.GOOGLE,
        subject: 'sub-1',
        email: 'User@Example.com',
        emailVerified: true,
        normalizedEmail: 'user@example.com',
      });
      expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(
        'user-id',
      );
    });

    it('rejects an invalid provider token', async () => {
      mockSocialTokenVerifier.verify.mockRejectedValue(
        new SocialTokenInvalidException(),
      );

      await expect(
        service.socialLogin(SocialProvider.APPLE, 'bad-token'),
      ).rejects.toBeInstanceOf(SocialTokenInvalidException);
      expect(
        mockIdentityAccountService.resolveSocialAccount,
      ).not.toHaveBeenCalled();
    });

    it('rejects an inactive resolved account', async () => {
      mockSocialTokenVerifier.verify.mockResolvedValue({
        provider: SocialProvider.GOOGLE,
        subject: 'sub-1',
        email: 'user@example.com',
        emailVerified: true,
      });
      mockIdentityAccountService.resolveSocialAccount.mockResolvedValue({
        userId: 'user-id',
        isActive: false,
      });

      await expect(
        service.socialLogin(SocialProvider.GOOGLE, 'id-token'),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(mockTokenService.createRefreshToken).not.toHaveBeenCalled();
    });
  });
});
