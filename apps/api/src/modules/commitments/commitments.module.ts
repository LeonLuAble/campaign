import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMITMENT_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { VegetarianModule } from '../vegetarian/vegetarian.module.js';
import { CommitmentService } from './application/commitment.service.js';
import { Commitment } from './domain/commitment.entity.js';
import { CampaignCommitmentOptionsController } from './presentation/campaign-commitment-options.controller.js';
import { CommitmentsController } from './presentation/commitments.controller.js';
import { ParticipationCommitmentsController } from './presentation/participation-commitments.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commitment]),
    AuthModule,
    VegetarianModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ParticipationModule),
  ],
  controllers: [
    CampaignCommitmentOptionsController,
    ParticipationCommitmentsController,
    CommitmentsController,
  ],
  providers: [
    CommitmentService,
    { provide: COMMITMENT_READER, useExisting: CommitmentService },
  ],
  exports: [CommitmentService, COMMITMENT_READER],
})
export class CommitmentsModule {}
