import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PARTICIPATION_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { Commitment } from '../commitments/domain/commitment.entity.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MEMBERSHIP_LIFECYCLE_LISTENER } from '../memberships/application/membership-lifecycle.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AutoEnrolmentService } from './application/auto-enrolment.service.js';
import { AUTO_ENROLMENT_SERVICE } from './application/auto-enrolment.tokens.js';
import { ParticipationService } from './application/participation.service.js';
import { Participation } from './domain/participation.entity.js';
import { CampaignAutoEnrolController } from './presentation/campaign-auto-enrol.controller.js';
import { CampaignParticipationSummaryController } from './presentation/campaign-participation-summary.controller.js';
import { CampaignParticipationsController } from './presentation/campaign-participations.controller.js';
import { ParticipationsController } from './presentation/participations.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participation, Commitment]),
    AuthModule,
    IdentityModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [
    CampaignParticipationsController,
    CampaignAutoEnrolController,
    CampaignParticipationSummaryController,
    ParticipationsController,
  ],
  providers: [
    ParticipationService,
    AutoEnrolmentService,
    { provide: PARTICIPATION_READER, useExisting: ParticipationService },
    { provide: AUTO_ENROLMENT_SERVICE, useExisting: AutoEnrolmentService },
    {
      provide: MEMBERSHIP_LIFECYCLE_LISTENER,
      useExisting: AutoEnrolmentService,
    },
  ],
  exports: [
    ParticipationService,
    PARTICIPATION_READER,
    AutoEnrolmentService,
    AUTO_ENROLMENT_SERVICE,
    MEMBERSHIP_LIFECYCLE_LISTENER,
  ],
})
export class ParticipationModule {}
