import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { UserToken, UserTokenType } from '../domain/user-token.entity.js';

export interface StoredUserToken {
  id: string;
  userId: string;
  identityId: string | null;
  type: UserTokenType;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface CreateUserTokenInput {
  userId: string;
  identityId?: string | null;
  type: UserTokenType;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class UserTokenService {
  constructor(
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
    private readonly dataSource: DataSource,
  ) {}

  async findByHash(tokenHash: string): Promise<StoredUserToken | null> {
    return this.map(
      await this.userTokenRepository.findOne({
        where: { token_hash: tokenHash },
      }),
    );
  }

  async supersedeUnusedAndCreate(
    input: CreateUserTokenInput,
  ): Promise<StoredUserToken> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserToken);
      await repository.update(
        {
          user_id: input.userId,
          type: input.type,
          used_at: IsNull(),
        },
        { used_at: new Date() },
      );

      const entity = repository.create({
        user_id: input.userId,
        identity_id: input.identityId ?? null,
        type: input.type,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        used_at: null,
      });
      return this.map(await repository.save(entity)) as StoredUserToken;
    });
  }

  private map(token: UserToken | null): StoredUserToken | null {
    if (!token) {
      return null;
    }
    return {
      id: token.id,
      userId: token.user_id,
      identityId: token.identity_id ?? null,
      type: token.type,
      expiresAt: token.expires_at,
      usedAt: token.used_at,
    };
  }
}
