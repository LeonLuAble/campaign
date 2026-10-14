import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import type { User } from './user.entity.js';

export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

@Entity('user_social_identities')
@Unique(['provider', 'provider_subject'])
@Index(['user_id'])
export class UserSocialIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: SocialProvider,
  })
  provider: SocialProvider;

  @Column({ type: 'varchar', length: 255 })
  provider_subject: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_email: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne('User', 'social_identities', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
