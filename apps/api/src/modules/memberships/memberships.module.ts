import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MEMBERSHIP_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
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
  ],
  controllers: [MembershipsController],
  providers: [
    MembershipService,
    { provide: MEMBERSHIP_READER, useExisting: MembershipService },
  ],
  exports: [MembershipService, MEMBERSHIP_READER],
})
export class MembershipsModule {}
