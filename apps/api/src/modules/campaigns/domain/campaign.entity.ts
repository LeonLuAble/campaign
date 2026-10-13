import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  STARTED = 'started',
  COMPLETED = 'completed',
}

@Entity('campaigns')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'uuid' })
  scope_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    enumName: 'campaign_status_enum',
  })
  status: CampaignStatus;

  @Column({ type: 'varchar', length: 64 })
  timezone: string;

  @Column({ type: 'date', nullable: true })
  starts_on: string | null;

  @Column({ type: 'date', nullable: true })
  ends_on: string | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
