import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MilestoneMetric {
  COMPLETION_PERCENT = 'completion_percent',
  ACHIEVED_VALUE = 'achieved_value',
}

@Entity('milestones')
@Index(['tenant_id'])
@Index(['campaign_id'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: MilestoneMetric,
    enumName: 'milestone_metric_enum',
  })
  metric: MilestoneMetric;

  @Column({ type: 'int' })
  threshold_value: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
