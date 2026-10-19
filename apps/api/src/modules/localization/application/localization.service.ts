import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Translation } from '../domain/translation.entity.js';
import {
  LOCALES,
  listTranslationRows,
  resolveLocale,
  type SupportedLocale,
} from './locale-catalog.js';

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

export type CampaignContentField = 'name' | 'description' | 'treeDisplayName';

export interface CampaignContentTranslations {
  en?: Partial<Record<CampaignContentField, string | null>>;
}

export type MilestoneContentField = 'name' | 'description';

export interface MilestoneContentTranslations {
  en?: Partial<Record<MilestoneContentField, string | null>>;
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

  async resolveTranslation(
    locale: SupportedLocale,
    namespace: string,
    key: string,
  ): Promise<string | null> {
    const row = await this.translationRepository.findOne({
      where: { locale, namespace, key },
    });
    if (row) {
      return row.value;
    }
    const fallback = listTranslationRows().find(
      (entry) =>
        entry.locale === locale &&
        entry.namespace === namespace &&
        entry.key === key,
    );
    return fallback?.value ?? null;
  }

  tenantNamespace(tenantId: string): string {
    return `tenant:${tenantId}`;
  }

  campaignContentKey(campaignId: string, field: CampaignContentField): string {
    return `campaign.${campaignId}.${field}`;
  }

  milestoneContentKey(
    milestoneId: string,
    field: MilestoneContentField,
  ): string {
    return `milestone.${milestoneId}.${field}`;
  }

  async resolveCampaignContent(
    locale: SupportedLocale,
    tenantId: string,
    campaignId: string,
    field: CampaignContentField,
    primary: string | null,
  ): Promise<string | null> {
    return this.resolveTenantContent(
      locale,
      tenantId,
      this.campaignContentKey(campaignId, field),
      primary,
    );
  }

  async resolveMilestoneContent(
    locale: SupportedLocale,
    tenantId: string,
    milestoneId: string,
    field: MilestoneContentField,
    primary: string | null,
  ): Promise<string | null> {
    return this.resolveTenantContent(
      locale,
      tenantId,
      this.milestoneContentKey(milestoneId, field),
      primary,
    );
  }

  /** Stored English override for a milestone field, or null. */
  async readMilestoneEnglish(
    tenantId: string,
    milestoneId: string,
    field: MilestoneContentField,
  ): Promise<string | null> {
    const row = await this.translationRepository.findOne({
      where: {
        locale: 'en',
        namespace: this.tenantNamespace(tenantId),
        key: this.milestoneContentKey(milestoneId, field),
      },
    });
    return row?.value ?? null;
  }

  async upsertCampaignContentTranslations(
    tenantId: string,
    campaignId: string,
    translations: CampaignContentTranslations | undefined,
  ): Promise<void> {
    await this.upsertTenantEnglish(
      tenantId,
      translations?.en,
      ['name', 'description', 'treeDisplayName'],
      (field) => this.campaignContentKey(campaignId, field),
    );
  }

  async upsertMilestoneContentTranslations(
    tenantId: string,
    milestoneId: string,
    translations: MilestoneContentTranslations | undefined,
  ): Promise<void> {
    await this.upsertTenantEnglish(
      tenantId,
      translations?.en,
      ['name', 'description'],
      (field) => this.milestoneContentKey(milestoneId, field),
    );
  }

  private async resolveTenantContent(
    locale: SupportedLocale,
    tenantId: string,
    key: string,
    primary: string | null,
  ): Promise<string | null> {
    if (locale !== 'zh-Hans') {
      const override = await this.resolveTranslation(
        locale,
        this.tenantNamespace(tenantId),
        key,
      );
      if (override != null && override.trim().length > 0) {
        return override;
      }
    }
    return primary;
  }

  /** Missing fields are left alone; null or blank removes the override. */
  private async upsertTenantEnglish<F extends string>(
    tenantId: string,
    en: Partial<Record<F, string | null>> | undefined,
    fields: readonly F[],
    keyFor: (field: F) => string,
  ): Promise<void> {
    if (!en) {
      return;
    }
    const namespace = this.tenantNamespace(tenantId);
    for (const field of fields) {
      if (!(field in en)) {
        continue;
      }
      const value = en[field];
      const key = keyFor(field);
      const existing = await this.translationRepository.findOne({
        where: { locale: 'en', namespace, key },
      });
      if (value == null || `${value}`.trim() === '') {
        if (existing) {
          await this.translationRepository.remove(existing);
        }
        continue;
      }
      const trimmed = `${value}`.trim();
      if (existing) {
        existing.value = trimmed;
        await this.translationRepository.save(existing);
      } else {
        await this.translationRepository.save(
          this.translationRepository.create({
            locale: 'en',
            namespace,
            key,
            value: trimmed,
          }),
        );
      }
    }
  }
}
