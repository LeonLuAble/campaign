import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../domain/refresh-token.entity.js';

export interface StoredRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  parentTokenId: string | null;
  expiresAt: Date;
}

export interface RefreshTokenWriter {
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  revokeIfActive(id: string, reason: string): Promise<boolean>;
  create(input: CreateRefreshTokenInput): Promise<StoredRefreshToken>;
  revokeFamily(familyId: string, reason: string): Promise<void>;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
  ) {}

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.map(
      await this.refreshTokenRepository.findOne({
        where: { token_hash: tokenHash },
      }),
    );
  }

  async create(input: CreateRefreshTokenInput): Promise<StoredRefreshToken> {
    return this.persist(this.refreshTokenRepository, input);
  }

  async revokeIfActive(id: string, reason: string): Promise<boolean> {
    return this.revokeActiveRow(this.refreshTokenRepository, id, reason);
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
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

  async revokeUser(userId: string, reason: string): Promise<void> {
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

  async withTransaction<T>(
    work: (tx: RefreshTokenWriter) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RefreshToken);
      const writer: RefreshTokenWriter = {
        findByHash: async (tokenHash) =>
          this.map(await repo.findOne({ where: { token_hash: tokenHash } })),
        revokeIfActive: (id, reason) => this.revokeActiveRow(repo, id, reason),
        create: (input) => this.persist(repo, input),
        revokeFamily: async (familyId, reason) => {
          await repo.update(
            {
              family_id: familyId,
              revoked_at: IsNull(),
            },
            {
              revoked_at: new Date(),
              revocation_reason: reason,
            },
          );
        },
      };
      return work(writer);
    });
  }

  private async persist(
    repo: Repository<RefreshToken>,
    input: CreateRefreshTokenInput,
  ): Promise<StoredRefreshToken> {
    const entity = repo.create({
      user_id: input.userId,
      token_hash: input.tokenHash,
      family_id: input.familyId,
      parent_token_id: input.parentTokenId,
      expires_at: input.expiresAt,
      revoked_at: null,
      revocation_reason: null,
    });
    return this.map(await repo.save(entity)) as StoredRefreshToken;
  }

  private async revokeActiveRow(
    repo: Repository<RefreshToken>,
    id: string,
    reason: string,
  ): Promise<boolean> {
    const result = await repo.update(
      {
        id,
        revoked_at: IsNull(),
      },
      {
        revoked_at: new Date(),
        revocation_reason: reason,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  private map(token: RefreshToken | null): StoredRefreshToken | null {
    if (!token) {
      return null;
    }
    return {
      id: token.id,
      userId: token.user_id,
      familyId: token.family_id,
      expiresAt: token.expires_at,
      revokedAt: token.revoked_at,
    };
  }
}
