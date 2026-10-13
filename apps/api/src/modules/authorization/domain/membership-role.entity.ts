import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('membership_roles')
export class MembershipRole {
  @PrimaryColumn({ type: 'uuid' })
  membership_id: string;

  @PrimaryColumn({ type: 'uuid' })
  role_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
