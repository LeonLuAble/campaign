import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshToken } from '../../identity/domain/refresh-token.entity.js';
import {
  TokenInvalidException,
  TokenReusedException,
} from './auth.exceptions.js';
import { TokenService } from './token.service.js';

describe('TokenService', () => {
  let service: TokenService;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        JWT_ACCESS_SECRET: 'test-access-secret-min-32-characters-xx',
        JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-x',
        JWT_ACCESS_TTL_SECONDS: 900,
        JWT_REFRESH_TTL_SECONDS: 604800,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockJwtService = {
    sign: vi.fn(),
    verifyAsync: vi.fn(),
  };

  const mockRefreshTokenRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with the correct payload', () => {
      const userId = 'test-user-id';
      const token = 'test-access-token';
      mockJwtService.sign.mockReturnValue(token);

      const result = service.generateAccessToken(userId);

      expect(result).toBe(token);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: userId },
        {
          secret: 'test-access-secret-min-32-characters-xx',
          expiresIn: 900,
        },
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify an access token', async () => {
      const token = 'test-token';
      const payload = { sub: 'user-id', iat: 123, exp: 456 };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(payload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: 'test-access-secret-min-32-characters-xx',
      });
    });
  });

  describe('createRefreshToken', () => {
    it('should persist only a hash of the raw refresh token', async () => {
      const userId = 'test-user-id';
      mockRefreshTokenRepository.create.mockImplementation((value) => value);
      mockRefreshTokenRepository.save.mockImplementation(
        async (value) => value,
      );
      mockJwtService.sign.mockReturnValue('test-access-token');

      const result = await service.createRefreshToken(userId);

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          token_hash: service.hashToken(result.refreshToken),
          parent_token_id: null,
          revoked_at: null,
          revocation_reason: null,
        }),
      );
      const created = mockRefreshTokenRepository.create.mock.calls[0][0] as {
        family_id: string;
        token_hash: string;
      };
      expect(created.family_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(created.token_hash).not.toBe(result.refreshToken);
    });

    it('should create a child refresh token in the same family', async () => {
      const userId = 'test-user-id';
      const familyId = '11111111-1111-1111-1111-111111111111';
      const parentTokenId = '22222222-2222-2222-2222-222222222222';
      mockRefreshTokenRepository.create.mockImplementation((value) => value);
      mockRefreshTokenRepository.save.mockImplementation(
        async (value) => value,
      );
      mockJwtService.sign.mockReturnValue('test-access-token');

      await service.createRefreshToken(userId, familyId, parentTokenId);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          family_id: familyId,
          parent_token_id: parentTokenId,
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate a valid refresh token', async () => {
      const rawToken = 'raw-refresh-token';
      const existingToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: service.hashToken(rawToken),
        family_id: '11111111-1111-1111-1111-111111111111',
        parent_token_id: null,
        expires_at: new Date(Date.now() + 100000),
        revoked_at: null,
        revocation_reason: null,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(existingToken);
      mockRefreshTokenRepository.save.mockImplementation(
        async (value) => value,
      );
      mockRefreshTokenRepository.create.mockImplementation((value) => value);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.rotateRefreshToken(rawToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeTruthy();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revoked_at: expect.any(Date),
          revocation_reason: 'ROTATED',
        }),
      );
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          family_id: existingToken.family_id,
          parent_token_id: existingToken.id,
        }),
      );
    });

    it('should throw TOKEN_INVALID for a token that is not found', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rotateRefreshToken('invalid-token'),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('should throw TOKEN_INVALID for an expired token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-id',
        user_id: 'user-id',
        token_hash: 'hash',
        family_id: '11111111-1111-1111-1111-111111111111',
        parent_token_id: null,
        expires_at: new Date(Date.now() - 100000),
        revoked_at: null,
        revocation_reason: null,
      });

      await expect(
        service.rotateRefreshToken('expired-token'),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('should revoke the family and throw TOKEN_REUSED when a revoked token is reused', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-id',
        user_id: 'user-id',
        token_hash: 'hash',
        family_id: '11111111-1111-1111-1111-111111111111',
        parent_token_id: null,
        expires_at: new Date(Date.now() + 100000),
        revoked_at: new Date(),
        revocation_reason: 'ROTATED',
      });
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.rotateRefreshToken('reused-token'),
      ).rejects.toBeInstanceOf(TokenReusedException);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        {
          family_id: '11111111-1111-1111-1111-111111111111',
          revoked_at: IsNull(),
        },
        {
          revoked_at: expect.any(Date),
          revocation_reason: 'TOKEN_REUSE_DETECTED',
        },
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a valid refresh token', async () => {
      const token = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: 'hash',
        family_id: '11111111-1111-1111-1111-111111111111',
        parent_token_id: null,
        expires_at: new Date(Date.now() + 100000),
        revoked_at: null,
        revocation_reason: null,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(token);
      mockRefreshTokenRepository.save.mockResolvedValue({
        ...token,
        revoked_at: new Date(),
        revocation_reason: 'USER_LOGOUT',
      });

      await expect(
        service.revokeRefreshToken('raw-token', 'USER_LOGOUT'),
      ).resolves.toBe(true);

      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revoked_at: expect.any(Date),
          revocation_reason: 'USER_LOGOUT',
        }),
      );
    });

    it('should return false for a token that is not found', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revokeRefreshToken('invalid-token', 'USER_LOGOUT'),
      ).resolves.toBe(false);
    });

    it('should not update a token that is already revoked', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-id',
        user_id: 'user-id',
        token_hash: 'hash',
        family_id: '11111111-1111-1111-1111-111111111111',
        parent_token_id: null,
        expires_at: new Date(Date.now() + 100000),
        revoked_at: new Date(),
        revocation_reason: 'ROTATED',
      });

      await expect(
        service.revokeRefreshToken('revoked-token', 'USER_LOGOUT'),
      ).resolves.toBe(false);
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('revokeFamilyTokens', () => {
    it('should revoke all active tokens in a family', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 3 });

      await service.revokeFamilyTokens(
        '11111111-1111-1111-1111-111111111111',
        'TOKEN_REUSE_DETECTED',
      );

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        {
          family_id: '11111111-1111-1111-1111-111111111111',
          revoked_at: IsNull(),
        },
        {
          revoked_at: expect.any(Date),
          revocation_reason: 'TOKEN_REUSE_DETECTED',
        },
      );
    });
  });

  describe('revokeUserTokens', () => {
    it('should revoke all active tokens for a user', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 5 });

      await service.revokeUserTokens('user-id', 'ACCOUNT_SUSPENDED');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        {
          user_id: 'user-id',
          revoked_at: IsNull(),
        },
        {
          revoked_at: expect.any(Date),
          revocation_reason: 'ACCOUNT_SUSPENDED',
        },
      );
    });
  });
});
