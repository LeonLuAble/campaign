import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMUNITY_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { CommunityService } from './application/community.service.js';
import { CommunityNode } from './domain/community-node.entity.js';
import { CommunitiesController } from './presentation/communities.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunityNode]),
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CustomersModule),
  ],
  controllers: [CommunitiesController],
  providers: [
    CommunityService,
    { provide: COMMUNITY_READER, useExisting: CommunityService },
  ],
  exports: [CommunityService, COMMUNITY_READER],
})
export class CommunitiesModule {}
