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

@Entity('refresh_tokens')
@Unique(['token_hash'])
@Index(['user_id'])
@Index(['family_id'])
@Index(['expires_at'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  token_hash: string;

  @Column({ type: 'uuid' })
  family_id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_token_id: string | null;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  revocation_reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('User', 'refresh_tokens', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne('RefreshToken', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_token_id' })
  parent_token: RefreshToken | null;
}
