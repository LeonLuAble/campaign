import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TENANT_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { CustomerService } from './application/customer.service.js';
import { Tenant } from './domain/tenant.entity.js';
import { CustomersController } from './presentation/customers.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [CustomersController],
  providers: [
    CustomerService,
    { provide: TENANT_READER, useExisting: CustomerService },
  ],
  exports: [CustomerService, TENANT_READER],
})
export class CustomersModule {}
