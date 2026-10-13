export const CAMPAIGN_NOTIFICATIONS = Symbol('CAMPAIGN_NOTIFICATIONS');

export interface CampaignStartedNotification {
  tenantId: string;
  campaignId: string;
  campaignName: string;
}

export interface MilestoneAchievedNotification {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  milestoneId: string;
  milestoneName: string;
}

export interface CampaignNotifications {
  notifyCampaignStarted(input: CampaignStartedNotification): Promise<void>;
  notifyMilestoneAchieved(input: MilestoneAchievedNotification): Promise<void>;
}
