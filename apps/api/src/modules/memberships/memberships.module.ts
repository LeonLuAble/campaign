import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MEMBERSHIP_READER,
  MEMBERSHIP_SERVICE,
} from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { MembershipInvitationService } from './application/membership-invitation.service.js';
import { MembershipService } from './application/membership.service.js';
import { Membership } from './domain/membership.entity.js';
import { MembershipsController } from './presentation/memberships.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership]),
    AuthModule,
    IdentityModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => ParticipationModule),
  ],
  controllers: [MembershipsController],
  providers: [
    MembershipService,
    MembershipInvitationService,
    { provide: MEMBERSHIP_READER, useExisting: MembershipService },
    { provide: MEMBERSHIP_SERVICE, useExisting: MembershipService },
  ],
  exports: [MembershipService, MEMBERSHIP_READER, MEMBERSHIP_SERVICE],
})
export class MembershipsModule {}
