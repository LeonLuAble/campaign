import { CampaignStatus } from '../domain/campaign.entity.js';

const NEXT_STATUS: Record<CampaignStatus, CampaignStatus | null> = {
  [CampaignStatus.DRAFT]: CampaignStatus.PUBLISHED,
  [CampaignStatus.PUBLISHED]: CampaignStatus.STARTED,
  [CampaignStatus.STARTED]: CampaignStatus.COMPLETED,
  [CampaignStatus.COMPLETED]: null,
};

export function nextCampaignStatus(
  current: CampaignStatus,
): CampaignStatus | null {
  return NEXT_STATUS[current];
}

export function canTransitionCampaign(
  from: CampaignStatus,
  to: CampaignStatus,
): boolean {
  return NEXT_STATUS[from] === to;
}

export function canMutateCampaignDefinition(status: CampaignStatus): boolean {
  return status === CampaignStatus.DRAFT;
}

export function canEnrollInCampaign(status: CampaignStatus): boolean {
  return (
    status === CampaignStatus.PUBLISHED || status === CampaignStatus.STARTED
  );
}

export function canPledgeCommitment(status: CampaignStatus): boolean {
  return (
    status === CampaignStatus.PUBLISHED || status === CampaignStatus.STARTED
  );
}

export function canRecordActions(status: CampaignStatus): boolean {
  return status === CampaignStatus.STARTED;
}
