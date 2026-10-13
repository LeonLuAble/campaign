import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CompletionStatus } from '../../progress/application/completion.js';

@Entity('milestone_progress')
@Index(['tenant_id'])
export class MilestoneProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', unique: true })
  milestone_id: string;

  @Column({ type: 'int' })
  achieved_value: number;

  @Column({ type: 'int' })
  target_value: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  completion_percent: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: CompletionStatus;

  @Column({ type: 'boolean' })
  crossed: boolean;

  @Column({ type: 'timestamptz' })
  computed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
