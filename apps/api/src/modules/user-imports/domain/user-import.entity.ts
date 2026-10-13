import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserImportRow } from './user-import-row.entity.js';

export enum UserImportStatus {
  UPLOADED = 'uploaded',
  MAPPED = 'mapped',
  VALIDATED = 'validated',
  CONFIRMED = 'confirmed',
}

@Entity('user_imports')
@Index(['tenant_id'])
@Index(['tenant_id', 'created_at'])
export class UserImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  default_community_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({
    type: 'enum',
    enum: UserImportStatus,
    enumName: 'user_import_status_enum',
  })
  status: UserImportStatus;

  @Column({ type: 'jsonb' })
  headers: string[];

  @Column({ type: 'jsonb', nullable: true })
  column_mapping: Record<string, string> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @OneToMany(() => UserImportRow, (row) => row.import)
  rows: UserImportRow[];
}
