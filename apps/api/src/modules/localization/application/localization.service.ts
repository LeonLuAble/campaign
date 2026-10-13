import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Translation } from '../domain/translation.entity.js';
import {
  LOCALES,
  listTranslationRows,
  resolveLocale,
} from './locale-catalog.js';
import type { SupportedLocale } from './locale-catalog.js';

export interface LocaleResponse {
  code: SupportedLocale;
  name: string;
}

export interface TranslationResponse {
  locale: string;
  namespace: string;
  key: string;
  value: string;
}

@Injectable()
export class LocalizationService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
  ) {}

  listLocales(): LocaleResponse[] {
    return LOCALES.map((locale) => ({ ...locale }));
  }

  async listTranslations(
    locale: string,
    namespace?: string,
  ): Promise<TranslationResponse[]> {
    const resolved = resolveLocale(locale);
    const rows = await this.translationRepository.find({
      where: namespace
        ? { locale: resolved, namespace }
        : { locale: resolved },
      order: { namespace: 'ASC', key: 'ASC' },
    });
    if (rows.length > 0) {
      return rows.map((row) => ({
        locale: row.locale,
        namespace: row.namespace,
        key: row.key,
        value: row.value,
      }));
    }
    return listTranslationRows()
      .filter(
        (row) =>
          row.locale === resolved &&
          (namespace == null || row.namespace === namespace),
      )
      .map((row) => ({
        locale: row.locale,
        namespace: row.namespace,
        key: row.key,
        value: row.value,
      }));
  }
}
