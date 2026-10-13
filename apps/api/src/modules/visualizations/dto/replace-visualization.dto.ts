import { IsIn, IsObject, IsOptional } from 'class-validator';
import { VISUALIZATION_TYPES } from '../domain/visualization.entity.js';

export class ReplaceVisualizationDto {
  @IsIn(VISUALIZATION_TYPES)
  type: (typeof VISUALIZATION_TYPES)[number];

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
