import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { UserImportService } from './application/user-import.service.js';
import { UserImportRow } from './domain/user-import-row.entity.js';
import { UserImport } from './domain/user-import.entity.js';
import { UserImportsController } from './presentation/user-imports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserImport, UserImportRow]),
    AuthModule,
    IdentityModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [UserImportsController],
  providers: [UserImportService],
  exports: [UserImportService],
})
export class UserImportsModule {}
