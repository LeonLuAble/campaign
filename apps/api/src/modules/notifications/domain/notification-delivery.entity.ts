import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type NotificationDeliveryChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'skipped'
  | 'failed';

@Entity('notification_deliveries')
@Unique(['dedupe_key'])
@Index(['tenant_id', 'user_id'])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  notification_id: string | null;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  channel: NotificationDeliveryChannel;

  @Column({ type: 'varchar', length: 50 })
  template: string;

  @Column({ type: 'varchar', length: 20 })
  status: NotificationDeliveryStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  skip_reason: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 300 })
  dedupe_key: string;

  @Column({ type: 'timestamptz' })
  scheduled_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
