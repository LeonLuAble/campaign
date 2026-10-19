import type { TenantContext } from '../../authorization/application/tenant-context.js';

export const AUTO_ENROLMENT_SERVICE = Symbol('AUTO_ENROLMENT_SERVICE');

export interface AutoEnrolSyncResult {
  created: number;
  alreadyEnrolled: number;
  skipped: number;
}

/** Port used by CampaignService / ParticipationService (avoids circular imports). */
export interface AutoEnrolmentPort {
  reconcileAutoEnrolment(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<AutoEnrolSyncResult>;
  reconcileUserAcrossAutoCampaigns(
    tenantId: string,
    userId: string,
  ): Promise<void>;
  ensureCallerEnrolledIfAuto(
    tenant: TenantContext,
    campaignId: string,
    userId: string,
  ): Promise<void>;
}
