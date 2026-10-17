import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { LocalizationModule } from '../localization/localization.module.js';
import { OutcomesModule } from '../outcomes/outcomes.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { DashboardService } from './application/dashboard.service.js';
import { VisualizationService } from './application/visualization.service.js';
import { Visualization } from './domain/visualization.entity.js';
import { CampaignVisualizationsController } from './presentation/campaign-visualizations.controller.js';
import { ParticipationDashboardsController } from './presentation/participation-dashboards.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visualization]),
    AuthModule,
    LocalizationModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => OutcomesModule),
    forwardRef(() => ProgressModule),
  ],
  controllers: [
    CampaignVisualizationsController,
    ParticipationDashboardsController,
  ],
  providers: [VisualizationService, DashboardService],
  exports: [VisualizationService, DashboardService],
})
export class VisualizationsModule {}
