import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PARTICIPATION_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { ParticipationService } from './application/participation.service.js';
import { Participation } from './domain/participation.entity.js';
import { CampaignParticipationsController } from './presentation/campaign-participations.controller.js';
import { ParticipationsController } from './presentation/participations.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participation]),
    AuthModule,
    IdentityModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [CampaignParticipationsController, ParticipationsController],
  providers: [
    ParticipationService,
    { provide: PARTICIPATION_READER, useExisting: ParticipationService },
  ],
  exports: [ParticipationService, PARTICIPATION_READER],
})
export class ParticipationModule {}
