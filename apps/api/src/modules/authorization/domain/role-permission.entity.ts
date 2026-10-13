import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ type: 'uuid' })
  role_id: string;

  @PrimaryColumn({ type: 'uuid' })
  permission_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
