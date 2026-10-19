import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommitmentDecision {
  COMMITTED = 'committed',
  NOT_TAKING_PART = 'not_taking_part',
}

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

  @Column({
    type: 'enum',
    enum: CommitmentDecision,
    enumName: 'commitment_decision_enum',
    default: CommitmentDecision.COMMITTED,
  })
  decision: CommitmentDecision;

  @Column({ type: 'int', nullable: true })
  target_value: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
