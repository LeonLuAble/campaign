import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { LocalizationService } from '../application/localization.service.js';
import { ListTranslationsQueryDto } from '../dto/list-translations.query.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class LocalesController {
  constructor(private readonly localization: LocalizationService) {}

  @Get('locales')
  listLocales() {
    return this.localization.listLocales();
  }

  @Get('translations')
  listTranslations(@Query() query: ListTranslationsQueryDto) {
    return this.localization.listTranslations(query.locale, query.namespace);
  }
}
