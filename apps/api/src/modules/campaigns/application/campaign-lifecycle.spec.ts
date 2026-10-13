import { describe, expect, it } from 'vitest';
import { CampaignStatus } from '../domain/campaign.entity.js';
import {
  canEnrollInCampaign,
  canMutateCampaignDefinition,
  canTransitionCampaign,
  nextCampaignStatus,
} from './campaign-lifecycle.js';

describe('campaign lifecycle', () => {
  it('allows only forward one-step transitions', () => {
    expect(nextCampaignStatus(CampaignStatus.DRAFT)).toBe(
      CampaignStatus.PUBLISHED,
    );
    expect(
      canTransitionCampaign(CampaignStatus.DRAFT, CampaignStatus.PUBLISHED),
    ).toBe(true);
    expect(
      canTransitionCampaign(CampaignStatus.DRAFT, CampaignStatus.STARTED),
    ).toBe(false);
    expect(
      canTransitionCampaign(CampaignStatus.PUBLISHED, CampaignStatus.DRAFT),
    ).toBe(false);
    expect(nextCampaignStatus(CampaignStatus.COMPLETED)).toBeNull();
  });

  it('locks definition edits after publish', () => {
    expect(canMutateCampaignDefinition(CampaignStatus.DRAFT)).toBe(true);
    expect(canMutateCampaignDefinition(CampaignStatus.PUBLISHED)).toBe(false);
    expect(canMutateCampaignDefinition(CampaignStatus.STARTED)).toBe(false);
    expect(canMutateCampaignDefinition(CampaignStatus.COMPLETED)).toBe(false);
  });

  it('allows enrollment only while published or started', () => {
    expect(canEnrollInCampaign(CampaignStatus.DRAFT)).toBe(false);
    expect(canEnrollInCampaign(CampaignStatus.PUBLISHED)).toBe(true);
    expect(canEnrollInCampaign(CampaignStatus.STARTED)).toBe(true);
    expect(canEnrollInCampaign(CampaignStatus.COMPLETED)).toBe(false);
  });
});
