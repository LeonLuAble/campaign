import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CAMPAIGN_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommunitiesModule } from '../communities/communities.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { LocalizationModule } from '../localization/localization.module.js';
import { VegetarianModule } from '../vegetarian/vegetarian.module.js';
import { CampaignRuleStrategyCatalogService } from './application/campaign-rule-strategy-catalog.service.js';
import { CampaignService } from './application/campaign.service.js';
import { CampaignCommunity } from './domain/campaign-community.entity.js';
import { CampaignConfiguration } from './domain/campaign-configuration.entity.js';
import { CampaignScope } from './domain/campaign-scope.entity.js';
import { CampaignTemplate } from './domain/campaign-template.entity.js';
import { Campaign } from './domain/campaign.entity.js';
import { CampaignRuleStrategiesController } from './presentation/campaign-rule-strategies.controller.js';
import { CampaignScopesController } from './presentation/campaign-scopes.controller.js';
import { CampaignTemplatesController } from './presentation/campaign-templates.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CampaignsController } from './presentation/campaigns.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignTemplate,
      CampaignScope,
      Campaign,
      CampaignConfiguration,
      CampaignCommunity,
    ]),
    AuthModule,
    LocalizationModule,
    VegetarianModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    CampaignTemplatesController,
    CampaignScopesController,
    CampaignRuleStrategiesController,
    CampaignsController,
  ],
  providers: [
    CampaignService,
    CampaignRuleStrategyCatalogService,
    { provide: CAMPAIGN_READER, useExisting: CampaignService },
  ],
  exports: [CampaignService, CAMPAIGN_READER],
})
export class CampaignsModule {}
