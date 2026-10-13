import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import {
  RefreshTokenService,
  type RefreshTokenWriter,
  type StoredRefreshToken,
} from '../../identity/application/refresh-token.service.js';
import {
  TokenInvalidException,
  TokenReusedException,
} from './auth.exceptions.js';

export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface CreateRefreshTokenOptions {
  familyId?: string;
  parentTokenId?: string;
  expiresAt?: Date;
}

const JWT_ALGORITHM = 'HS256' as const;

@Injectable()
export class TokenService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly identityAccountService: IdentityAccountService,
  ) {
    this.accessTtl = Number(
      this.configService.get('JWT_ACCESS_TTL_SECONDS', 900),
    );
    this.refreshTtl = Number(
      this.configService.get('JWT_REFRESH_TTL_SECONDS', 604800),
    );
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required');
    }
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.issuer = this.configService.get<string>('JWT_ISSUER', 'campaign-api');
    this.audience = this.configService.get<string>(
      'JWT_AUDIENCE',
      'campaign-clients',
    );
  }

  generateAccessToken(userId: string): string {
    const payload: Pick<JwtPayload, 'sub'> = { sub: userId };
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      algorithm: JWT_ALGORITHM,
      expiresIn: this.accessTtl,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.accessSecret,
      algorithms: [JWT_ALGORITHM],
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  async createRefreshToken(
    userId: string,
    options: CreateRefreshTokenOptions = {},
  ): Promise<TokenPair> {
    const rawToken = randomBytes(32).toString('hex');
    await this.refreshTokenService.create({
      userId,
      tokenHash: this.hashToken(rawToken),
      familyId: options.familyId ?? randomUUID(),
      parentTokenId: options.parentTokenId ?? null,
      expiresAt:
        options.expiresAt ?? new Date(Date.now() + this.refreshTtl * 1000),
    });

    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: rawToken,
    };
  }

  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    return this.refreshTokenService.withTransaction(async (tx) => {
      const existingToken = await tx.findByHash(this.hashToken(rawToken));
      if (!existingToken) {
        throw new TokenInvalidException();
      }

      if (existingToken.revokedAt) {
        await tx.revokeFamily(existingToken.familyId, 'TOKEN_REUSE_DETECTED');
        throw new TokenReusedException();
      }

      if (existingToken.expiresAt < new Date()) {
        throw new TokenInvalidException();
      }

      const isActive = await this.identityAccountService.isUserActive(
        existingToken.userId,
      );
      if (!isActive) {
        await tx.revokeFamily(existingToken.familyId, 'USER_INACTIVE');
        throw new TokenInvalidException();
      }

      const revoked = await tx.revokeIfActive(existingToken.id, 'ROTATED');
      if (!revoked) {
        await tx.revokeFamily(existingToken.familyId, 'TOKEN_REUSE_DETECTED');
        throw new TokenReusedException();
      }

      return this.issueChildToken(existingToken, tx);
    });
  }

  async findByRawToken(rawToken: string): Promise<StoredRefreshToken | null> {
    return this.refreshTokenService.findByHash(this.hashToken(rawToken));
  }

  async revokeRefreshToken(rawToken: string, reason: string): Promise<boolean> {
    const token = await this.findByRawToken(rawToken);
    if (!token || token.revokedAt) {
      return false;
    }
    return this.refreshTokenService.revokeIfActive(token.id, reason);
  }

  async revokeFamilyTokens(familyId: string, reason: string): Promise<void> {
    await this.refreshTokenService.revokeFamily(familyId, reason);
  }

  async revokeUserTokens(userId: string, reason: string): Promise<void> {
    await this.refreshTokenService.revokeUser(userId, reason);
  }

  hashToken(token: string): string {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }

  private async issueChildToken(
    parent: StoredRefreshToken,
    tx: RefreshTokenWriter,
  ): Promise<TokenPair> {
    const rawToken = randomBytes(32).toString('hex');
    await tx.create({
      userId: parent.userId,
      tokenHash: this.hashToken(rawToken),
      familyId: parent.familyId,
      parentTokenId: parent.id,
      expiresAt: parent.expiresAt,
    });

    return {
      accessToken: this.generateAccessToken(parent.userId),
      refreshToken: rawToken,
    };
  }
}
