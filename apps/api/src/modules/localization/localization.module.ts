import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { LocalizationService } from './application/localization.service.js';
import { Translation } from './domain/translation.entity.js';
import { LocalesController } from './presentation/locales.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Translation]), AuthModule],
  controllers: [LocalesController],
  providers: [LocalizationService],
  exports: [LocalizationService],
})
export class LocalizationModule {}
