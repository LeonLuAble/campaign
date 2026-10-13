import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericNumberTransformer } from '../../../shared/database/numeric-transformer.js';

@Entity('impact_factors')
@Index(['tenant_id'])
@Index(['campaign_id'])
export class ImpactFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  campaign_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  source_unit: string;

  @Column({ type: 'varchar', length: 100 })
  outcome_metric: string;

  @Column({ type: 'varchar', length: 50 })
  outcome_unit: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    transformer: numericNumberTransformer,
  })
  factor_value: number;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 2000 })
  source: string;

  @Column({ type: 'date' })
  effective_from: string;

  @Column({ type: 'date', nullable: true })
  effective_to: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
