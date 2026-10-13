import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('campaign_communities')
@Index(['tenant_id'])
@Index(['community_id'])
export class CampaignCommunity {
  @PrimaryColumn({ type: 'uuid' })
  campaign_id: string;

  @PrimaryColumn({ type: 'uuid' })
  community_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
