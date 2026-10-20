import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActionStatus {
  RECORDED = 'recorded',
  CANCELLED = 'cancelled',
}

export enum PrivacyLevel {
  PRIVATE = 'private',
  GROUP = 'group',
  COMMUNITY = 'community',
  CUSTOMER = 'customer',
  PUBLIC = 'public',
}

@Entity('actions')
@Index(['tenant_id'])
@Index(['campaign_id'])
@Index(['participation_id'])
export class Action {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid' })
  participation_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  action_definition_id: string;

  @Column({ type: 'date' })
  occurred_on: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    enumName: 'privacy_level_enum',
  })
  privacy_level: PrivacyLevel;

  @Column({
    type: 'enum',
    enum: ActionStatus,
    enumName: 'action_status_enum',
  })
  status: ActionStatus;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  /** Set when the day was entered as part of a range. */
  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  @Column({ type: 'uuid' })
  recorded_by_user_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  cancelled_by_user_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  corrected_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  corrected_by_user_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
