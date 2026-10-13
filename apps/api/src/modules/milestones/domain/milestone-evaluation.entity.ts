import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CompletionStatus } from '../../progress/application/completion.js';

@Entity('milestone_evaluations')
@Index(['tenant_id'])
@Index(['milestone_id'])
export class MilestoneEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  milestone_id: string;

  @Column({ type: 'uuid' })
  evaluated_by_user_id: string;

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
  evaluated_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
