import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { ActionsModule } from '../actions/actions.module.js';
import { CommitmentsModule } from '../commitments/commitments.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { MilestonesModule } from '../milestones/milestones.module.js';
import { MeasurementsModule } from '../measurements/measurements.module.js';
import { OutcomesModule } from '../outcomes/outcomes.module.js';
import { AuthorizationService } from './application/authorization.service.js';
import { TenantContextService } from './application/tenant-context.service.js';
import { MembershipRole } from './domain/membership-role.entity.js';
import { Permission } from './domain/permission.entity.js';
import { RolePermission } from './domain/role-permission.entity.js';
import { Role } from './domain/role.entity.js';
import { PermissionsController } from './presentation/permissions.controller.js';
import { PermissionsGuard } from './presentation/permissions.guard.js';
import { RolesController } from './presentation/roles.controller.js';
import { TenantScopeGuard } from './presentation/tenant-scope.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      MembershipRole,
    ]),
    AuthModule,
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => MembershipsModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => ParticipationModule),
    forwardRef(() => ActionsModule),
    forwardRef(() => CommitmentsModule),
    forwardRef(() => MilestonesModule),
    forwardRef(() => MeasurementsModule),
    forwardRef(() => OutcomesModule),
  ],
  controllers: [RolesController, PermissionsController],
  providers: [
    AuthorizationService,
    TenantContextService,
    TenantScopeGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthorizationService,
    TenantContextService,
    TenantScopeGuard,
    PermissionsGuard,
  ],
})
export class AuthorizationModule {}
