import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { RefreshTokenService } from '../../identity/application/refresh-token.service.js';
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
        JWT_ISSUER: 'campaign-api',
        JWT_AUDIENCE: 'campaign-clients',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockJwtService = {
    sign: vi.fn(),
    verifyAsync: vi.fn(),
  };

  const mockRefreshTokenService = {
    create: vi.fn(),
    findByHash: vi.fn(),
    revokeIfActive: vi.fn(),
    revokeFamily: vi.fn(),
    revokeUser: vi.fn(),
    withTransaction: vi.fn(),
  };

  const mockIdentityAccountService = {
    isUserActive: vi.fn(),
  };

  beforeEach(async () => {
    mockRefreshTokenService.withTransaction.mockImplementation(
      async (work: (tx: typeof mockRefreshTokenService) => unknown) =>
        work(mockRefreshTokenService),
    );
    mockIdentityAccountService.isUserActive.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        {
          provide: IdentityAccountService,
          useValue: mockIdentityAccountService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('signs with HS256, issuer, and audience', () => {
      mockJwtService.sign.mockReturnValue('test-access-token');

      const result = service.generateAccessToken('test-user-id');

      expect(result).toBe('test-access-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'test-user-id' },
        {
          secret: 'test-access-secret-min-32-characters-xx',
          algorithm: 'HS256',
          expiresIn: 900,
          issuer: 'campaign-api',
          audience: 'campaign-clients',
        },
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies with HS256, issuer, and audience', async () => {
      const payload = { sub: 'user-id', iat: 123, exp: 456 };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await expect(service.verifyAccessToken('test-token')).resolves.toEqual(
        payload,
      );
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('test-token', {
        secret: 'test-access-secret-min-32-characters-xx',
        algorithms: ['HS256'],
        issuer: 'campaign-api',
        audience: 'campaign-clients',
      });
    });
  });

  describe('createRefreshToken', () => {
    it('persists only a hash of the raw refresh token', async () => {
      mockRefreshTokenService.create.mockResolvedValue({ id: 'token-id' });
      mockJwtService.sign.mockReturnValue('test-access-token');

      const result = await service.createRefreshToken('test-user-id');

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          tokenHash: service.hashToken(result.refreshToken),
          parentTokenId: null,
        }),
      );
      const created = mockRefreshTokenService.create.mock.calls[0][0] as {
        familyId: string;
        tokenHash: string;
      };
      expect(created.familyId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(created.tokenHash).not.toBe(result.refreshToken);
    });

    it('creates a child refresh token in the same family with the family expiry', async () => {
      const familyExpiresAt = new Date('2026-12-01T00:00:00.000Z');
      mockRefreshTokenService.create.mockResolvedValue({ id: 'child-id' });
      mockJwtService.sign.mockReturnValue('test-access-token');

      await service.createRefreshToken('test-user-id', {
        familyId: '11111111-1111-1111-1111-111111111111',
        parentTokenId: '22222222-2222-2222-2222-222222222222',
        expiresAt: familyExpiresAt,
      });

      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          familyId: '11111111-1111-1111-1111-111111111111',
          parentTokenId: '22222222-2222-2222-2222-222222222222',
          expiresAt: familyExpiresAt,
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    const familyExpiresAt = new Date(Date.now() + 100000);
    const existingToken = {
      id: 'token-id',
      userId: 'user-id',
      familyId: '11111111-1111-1111-1111-111111111111',
      expiresAt: familyExpiresAt,
      revokedAt: null,
    };

    it('rotates a valid refresh token and keeps the family expiry', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue(existingToken);
      mockRefreshTokenService.revokeIfActive.mockResolvedValue(true);
      mockRefreshTokenService.create.mockResolvedValue({ id: 'child-id' });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.rotateRefreshToken('raw-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(mockRefreshTokenService.revokeIfActive).toHaveBeenCalledWith(
        'token-id',
        'ROTATED',
      );
      expect(mockRefreshTokenService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          familyId: existingToken.familyId,
          parentTokenId: existingToken.id,
          expiresAt: familyExpiresAt,
        }),
      );
    });

    it('throws TOKEN_INVALID for a token that is not found', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue(null);

      await expect(
        service.rotateRefreshToken('invalid-token'),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('throws TOKEN_INVALID for an expired token', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue({
        ...existingToken,
        expiresAt: new Date(Date.now() - 100000),
      });

      await expect(
        service.rotateRefreshToken('expired-token'),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('revokes the family and throws TOKEN_REUSED when a revoked token is reused', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue({
        ...existingToken,
        revokedAt: new Date(),
      });

      await expect(
        service.rotateRefreshToken('reused-token'),
      ).rejects.toBeInstanceOf(TokenReusedException);
      expect(mockRefreshTokenService.revokeFamily).toHaveBeenCalledWith(
        existingToken.familyId,
        'TOKEN_REUSE_DETECTED',
      );
    });

    it('treats a lost conditional revoke as reuse and revokes the family', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue(existingToken);
      mockRefreshTokenService.revokeIfActive.mockResolvedValue(false);

      await expect(
        service.rotateRefreshToken('raced-token'),
      ).rejects.toBeInstanceOf(TokenReusedException);
      expect(mockRefreshTokenService.revokeFamily).toHaveBeenCalledWith(
        existingToken.familyId,
        'TOKEN_REUSE_DETECTED',
      );
      expect(mockRefreshTokenService.create).not.toHaveBeenCalled();
    });

    it('rejects rotation and revokes the family when the user is inactive', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue(existingToken);
      mockIdentityAccountService.isUserActive.mockResolvedValue(false);

      await expect(
        service.rotateRefreshToken('inactive-user-token'),
      ).rejects.toBeInstanceOf(TokenInvalidException);
      expect(mockRefreshTokenService.revokeFamily).toHaveBeenCalledWith(
        existingToken.familyId,
        'USER_INACTIVE',
      );
      expect(mockRefreshTokenService.revokeIfActive).not.toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('revokes a valid refresh token', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        familyId: '11111111-1111-1111-1111-111111111111',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      });
      mockRefreshTokenService.revokeIfActive.mockResolvedValue(true);

      await expect(
        service.revokeRefreshToken('raw-token', 'USER_LOGOUT'),
      ).resolves.toBe(true);
      expect(mockRefreshTokenService.revokeIfActive).toHaveBeenCalledWith(
        'token-id',
        'USER_LOGOUT',
      );
    });

    it('returns false for a token that is not found', async () => {
      mockRefreshTokenService.findByHash.mockResolvedValue(null);

      await expect(
        service.revokeRefreshToken('invalid-token', 'USER_LOGOUT'),
      ).resolves.toBe(false);
    });
  });

  describe('revokeFamilyTokens', () => {
    it('delegates family revocation to identity', async () => {
      await service.revokeFamilyTokens(
        '11111111-1111-1111-1111-111111111111',
        'TOKEN_REUSE_DETECTED',
      );

      expect(mockRefreshTokenService.revokeFamily).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'TOKEN_REUSE_DETECTED',
      );
    });
  });
});
