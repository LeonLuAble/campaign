import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionDefinition } from '../actions/domain/action-definition.entity.js';
import { Action } from '../actions/domain/action.entity.js';
import { Submission } from '../actions/domain/submission.entity.js';
import { IMPACT_FACTOR_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { MeasurementsModule } from '../measurements/measurements.module.js';
import { Participation } from '../participation/domain/participation.entity.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { ImpactFactorService } from './application/impact-factor.service.js';
import { OutcomeService } from './application/outcome.service.js';
import { ImpactFactor } from './domain/impact-factor.entity.js';
import { CampaignImpactFactorsController } from './presentation/campaign-impact-factors.controller.js';
import { CampaignOutcomesController } from './presentation/campaign-outcomes.controller.js';
import { ImpactFactorsController } from './presentation/impact-factors.controller.js';
import { ParticipationOutcomesController } from './presentation/participation-outcomes.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImpactFactor,
      Action,
      Submission,
      ActionDefinition,
      Participation,
    ]),
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => MeasurementsModule),
    forwardRef(() => ParticipationModule),
  ],
  controllers: [
    CampaignImpactFactorsController,
    ImpactFactorsController,
    CampaignOutcomesController,
    ParticipationOutcomesController,
  ],
  providers: [
    ImpactFactorService,
    OutcomeService,
    { provide: IMPACT_FACTOR_READER, useExisting: ImpactFactorService },
  ],
  exports: [ImpactFactorService, OutcomeService, IMPACT_FACTOR_READER],
})
export class OutcomesModule {}
