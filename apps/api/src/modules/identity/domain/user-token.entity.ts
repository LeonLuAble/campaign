import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import type { User } from './user.entity.js';
import type { UserIdentity } from './user-identity.entity.js';

export enum UserTokenType {
  ACTIVATION = 'activation',
  PASSWORD_RESET = 'password_reset',
}

@Entity('user_tokens')
@Unique(['token_hash'])
@Index(['user_id'])
@Index(['identity_id'])
@Index(['type', 'expires_at'])
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  identity_id: string | null;

  @Column({
    type: 'enum',
    enum: UserTokenType,
  })
  type: UserTokenType;

  @Column({ type: 'varchar', length: 255 })
  token_hash: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne('UserIdentity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'identity_id' })
  identity: UserIdentity | null;
}
