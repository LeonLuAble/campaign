import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const VISUALIZATION_TYPE_TREE = 'tree';

export const VISUALIZATION_TYPES = [VISUALIZATION_TYPE_TREE] as const;

export type VisualizationType = (typeof VISUALIZATION_TYPES)[number];

@Entity('visualizations')
@Index(['tenant_id'])
export class Visualization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', unique: true })
  campaign_id: string;

  @Column({ type: 'varchar', length: 50 })
  type: VisualizationType;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
