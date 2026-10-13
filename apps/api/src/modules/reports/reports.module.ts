import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { VisualizationsModule } from '../visualizations/visualizations.module.js';
import { ReportService } from './application/report.service.js';
import { CampaignReportsController } from './presentation/campaign-reports.controller.js';
import { ParticipationReportsController } from './presentation/participation-reports.controller.js';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => VisualizationsModule),
  ],
  controllers: [ParticipationReportsController, CampaignReportsController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportsModule {}
