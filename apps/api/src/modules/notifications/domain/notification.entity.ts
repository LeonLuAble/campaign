import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CampaignNotificationType } from '../../localization/application/locale-catalog.js';

@Entity('notifications')
@Index(['tenant_id', 'user_id', 'created_at'])
export class InAppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  type: CampaignNotificationType;

  @Column({ type: 'varchar', length: 16 })
  locale: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  body: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, string>;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
