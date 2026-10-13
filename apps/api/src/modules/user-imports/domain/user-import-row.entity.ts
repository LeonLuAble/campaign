import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserImport } from './user-import.entity.js';

export enum UserImportRowStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  REVIEW = 'review',
  CREATED = 'created',
  MATCHED = 'matched',
}

@Entity('user_import_rows')
@Unique(['import_id', 'row_number'])
@Index(['import_id'])
@Index(['external_id'])
export class UserImportRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  import_id: string;

  @Column({ type: 'int' })
  row_number: number;

  @Column({ type: 'jsonb' })
  raw_data: Record<string, string>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  external_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  mobile: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name: string | null;

  @Column({ type: 'uuid', nullable: true })
  community_id: string | null;

  @Column({
    type: 'enum',
    enum: UserImportRowStatus,
    enumName: 'user_import_row_status_enum',
  })
  status: UserImportRowStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  error_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error_message: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_membership_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => UserImport, (imported) => imported.rows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'import_id' })
  import: UserImport;
}
