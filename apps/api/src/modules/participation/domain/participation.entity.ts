import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ParticipationStatus {
  ENROLLED = 'enrolled',
  WITHDRAWN = 'withdrawn',
}

@Entity('participations')
@Index(['tenant_id'])
@Index(['campaign_id'])
@Index(['user_id'])
export class Participation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  community_id: string | null;

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    enumName: 'participation_status_enum',
  })
  status: ParticipationStatus;

  @Column({ type: 'timestamptz' })
  enrolled_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  withdrawn_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
