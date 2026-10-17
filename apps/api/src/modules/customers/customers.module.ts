import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CUSTOMER_SERVICE,
  TENANT_READER,
} from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { CustomerService } from './application/customer.service.js';
import { Tenant } from './domain/tenant.entity.js';
import { CustomersController } from './presentation/customers.controller.js';
import { PlatformAdminGuard } from './presentation/platform-admin.guard.js';
import { PlatformCustomersController } from './presentation/platform-customers.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    AuthModule,
    IdentityModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [CustomersController, PlatformCustomersController],
  providers: [
    CustomerService,
    PlatformAdminGuard,
    { provide: TENANT_READER, useExisting: CustomerService },
    { provide: CUSTOMER_SERVICE, useExisting: CustomerService },
  ],
  exports: [CustomerService, TENANT_READER, CUSTOMER_SERVICE],
})
export class CustomersModule {}
