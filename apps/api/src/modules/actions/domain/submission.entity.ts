import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('submissions')
@Index(['tenant_id'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', unique: true })
  action_id: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    enumName: 'submission_status_enum',
  })
  status: SubmissionStatus;

  @Column({ type: 'uuid' })
  submitted_by_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by_user_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  review_note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
