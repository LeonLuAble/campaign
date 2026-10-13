import { IsIn, IsOptional } from 'class-validator';
import type { TimeSeriesGranularity } from '../../outcomes/application/outcome-math.js';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(['day', 'week'])
  granularity?: TimeSeriesGranularity;
}
