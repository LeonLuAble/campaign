import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../../identity/domain/refresh-token.entity.js';
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

@Injectable()
export class TokenService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
  }

  generateAccessToken(userId: string): string {
    const payload: Pick<JwtPayload, 'sub'> = { sub: userId };
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.accessSecret,
    });
  }

  async createRefreshToken(
    userId: string,
    familyId?: string,
    parentTokenId?: string,
  ): Promise<TokenPair> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.refreshTtl * 1000);

    const refreshToken = this.refreshTokenRepository.create({
      user_id: userId,
      token_hash: tokenHash,
      family_id: familyId ?? randomUUID(),
      parent_token_id: parentTokenId ?? null,
      expires_at: expiresAt,
      revoked_at: null,
      revocation_reason: null,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: rawToken,
    };
  }

  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    const existingToken = await this.findByRawToken(rawToken);

    if (!existingToken) {
      throw new TokenInvalidException();
    }

    if (existingToken.revoked_at) {
      await this.revokeFamilyTokens(
        existingToken.family_id,
        'TOKEN_REUSE_DETECTED',
      );
      throw new TokenReusedException();
    }

    if (existingToken.expires_at < new Date()) {
      throw new TokenInvalidException();
    }

    existingToken.revoked_at = new Date();
    existingToken.revocation_reason = 'ROTATED';
    await this.refreshTokenRepository.save(existingToken);

    return this.createRefreshToken(
      existingToken.user_id,
      existingToken.family_id,
      existingToken.id,
    );
  }

  async findByRawToken(rawToken: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token_hash: this.hashToken(rawToken) },
    });
  }

  async revokeRefreshToken(rawToken: string, reason: string): Promise<boolean> {
    const token = await this.findByRawToken(rawToken);
    if (!token || token.revoked_at) {
      return false;
    }

    token.revoked_at = new Date();
    token.revocation_reason = reason;
    await this.refreshTokenRepository.save(token);
    return true;
  }

  async revokeFamilyTokens(familyId: string, reason: string): Promise<void> {
    await this.refreshTokenRepository.update(
      {
        family_id: familyId,
        revoked_at: IsNull(),
      },
      {
        revoked_at: new Date(),
        revocation_reason: reason,
      },
    );
  }

  async revokeUserTokens(userId: string, reason: string): Promise<void> {
    await this.refreshTokenRepository.update(
      {
        user_id: userId,
        revoked_at: IsNull(),
      },
      {
        revoked_at: new Date(),
        revocation_reason: reason,
      },
    );
  }

  hashToken(token: string): string {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }
}
