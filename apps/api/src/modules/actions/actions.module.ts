import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACTION_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { VegetarianModule } from '../vegetarian/vegetarian.module.js';
import { ActionService } from './application/action.service.js';
import { ActionDefinition } from './domain/action-definition.entity.js';
import { Action } from './domain/action.entity.js';
import { Submission } from './domain/submission.entity.js';
import { ActionDefinitionsController } from './presentation/action-definitions.controller.js';
import { ActionsController } from './presentation/actions.controller.js';
import { CampaignActionDefinitionsController } from './presentation/campaign-action-definitions.controller.js';
import { CampaignActionsController } from './presentation/campaign-actions.controller.js';
import { ParticipationActionsController } from './presentation/participation-actions.controller.js';
import { SubmissionsController } from './presentation/submissions.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActionDefinition, Action, Submission]),
    AuthModule,
    VegetarianModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ParticipationModule),
  ],
  controllers: [
    CampaignActionDefinitionsController,
    ActionDefinitionsController,
    ActionsController,
    CampaignActionsController,
    ParticipationActionsController,
    SubmissionsController,
  ],
  providers: [
    ActionService,
    { provide: ACTION_READER, useExisting: ActionService },
  ],
  exports: [ActionService, ACTION_READER],
})
export class ActionsModule {}
