import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MEASUREMENT_DEFINITION_READER } from '../authorization/application/access-readers.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { MeasurementDefinitionService } from './application/measurement-definition.service.js';
import { MeasurementDefinition } from './domain/measurement-definition.entity.js';
import { CampaignMeasurementDefinitionsController } from './presentation/campaign-measurement-definitions.controller.js';
import { MeasurementDefinitionsController } from './presentation/measurement-definitions.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeasurementDefinition]),
    AuthModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => CustomersModule),
  ],
  controllers: [
    CampaignMeasurementDefinitionsController,
    MeasurementDefinitionsController,
  ],
  providers: [
    MeasurementDefinitionService,
    {
      provide: MEASUREMENT_DEFINITION_READER,
      useExisting: MeasurementDefinitionService,
    },
  ],
  exports: [MeasurementDefinitionService, MEASUREMENT_DEFINITION_READER],
})
export class MeasurementsModule {}
