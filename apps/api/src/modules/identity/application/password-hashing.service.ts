import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$VsCP2XSPKYlx/fWC1l6N3A$wli5I9EJfwj72SROQxoAbK0EV6hvsX3ymcYeqQMeMFY';

@Injectable()
export class PasswordHashingService {
  readonly dummyHash = DUMMY_PASSWORD_HASH;

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<boolean> {
    return this.verify(DUMMY_PASSWORD_HASH, password);
  }

  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }
}
