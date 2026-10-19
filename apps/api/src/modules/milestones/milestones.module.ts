import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MILESTONE_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { LocalizationModule } from '../localization/localization.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { MilestoneService } from './application/milestone.service.js';
import { MilestoneEvaluation } from './domain/milestone-evaluation.entity.js';
import { MilestoneProgress } from './domain/milestone-progress.entity.js';
import { Milestone } from './domain/milestone.entity.js';
import { CampaignMilestonesController } from './presentation/campaign-milestones.controller.js';
import { CampaignPeriodsController } from './presentation/campaign-periods.controller.js';
import { MilestonesController } from './presentation/milestones.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneProgress,
      MilestoneEvaluation,
    ]),
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    LocalizationModule,
    forwardRef(() => ProgressModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    CampaignMilestonesController,
    CampaignPeriodsController,
    MilestonesController,
  ],
  providers: [
    MilestoneService,
    { provide: MILESTONE_READER, useExisting: MilestoneService },
  ],
  exports: [MilestoneService, MILESTONE_READER],
})
export class MilestonesModule {}
