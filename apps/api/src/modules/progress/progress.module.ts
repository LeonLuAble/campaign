import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionDefinition } from '../actions/domain/action-definition.entity.js';
import { Action } from '../actions/domain/action.entity.js';
import { Submission } from '../actions/domain/submission.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { Commitment } from '../commitments/domain/commitment.entity.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { MilestonesModule } from '../milestones/milestones.module.js';
import { Participation } from '../participation/domain/participation.entity.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { VegetarianModule } from '../vegetarian/vegetarian.module.js';
import { ProgressService } from './application/progress.service.js';
import { CampaignProgressController } from './presentation/campaign-progress.controller.js';
import { ParticipationProgressController } from './presentation/participation-progress.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Action,
      Submission,
      ActionDefinition,
      Commitment,
      Participation,
    ]),
    AuthModule,
    VegetarianModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => ParticipationModule),
    forwardRef(() => MilestonesModule),
  ],
  controllers: [CampaignProgressController, ParticipationProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
