import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('commitments')
@Index(['tenant_id'])
@Index(['campaign_id'])
export class Commitment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid', unique: true })
  participation_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type_key: string | null;

  @Column({ type: 'int' })
  target_value: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
