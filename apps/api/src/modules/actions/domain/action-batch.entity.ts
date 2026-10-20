import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** One range entry; its days are stored as `actions` rows with `batch_id`. */
@Entity('action_batches')
@Index(['tenant_id'])
@Index(['campaign_id'])
@Index(['participation_id'])
export class ActionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid' })
  participation_id: string;

  @Column({ type: 'uuid' })
  action_definition_id: string;

  @Column({ type: 'date' })
  start_on: string;

  @Column({ type: 'date' })
  end_on: string;

  @Column({ type: 'int' })
  day_count: number;

  @Column({ type: 'int' })
  quantity_per_day: number;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
