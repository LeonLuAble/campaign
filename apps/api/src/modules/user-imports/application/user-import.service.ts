import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { RegistrationService } from '../../auth/application/registration.service.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import {
  UserImportRow,
  UserImportRowStatus,
} from '../domain/user-import-row.entity.js';
import { UserImport, UserImportStatus } from '../domain/user-import.entity.js';
import { CsvParseError, parseCsv } from './csv.js';
import { decideImportMatch } from './import-match.js';
import {
  assertMappingHeaders,
  detectCanonicalMapping,
  mappingCoversIdentifier,
  mappedValue,
  type ImportColumnMapping,
} from './import-mapping.js';
import {
  toImportSummary,
  toRowResult,
  type UserImportRowResult,
  type UserImportSummary,
} from './user-import.mapper.js';

export const USER_IMPORT_MAX_FILE_BYTES = 1_048_576;
export const USER_IMPORT_MAX_ROWS = 2000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TERMINAL_ROW_STATUSES = new Set<UserImportRowStatus>([
  UserImportRowStatus.CREATED,
  UserImportRowStatus.MATCHED,
]);

@Injectable()
export class UserImportService {
  private readonly logger = new Logger(UserImportService.name);

  constructor(
    @InjectRepository(UserImport)
    private readonly importRepository: Repository<UserImport>,
    @InjectRepository(UserImportRow)
    private readonly rowRepository: Repository<UserImportRow>,
    private readonly customers: CustomerService,
    private readonly communities: CommunityService,
    private readonly identities: IdentityAccountService,
    private readonly credentials: CredentialService,
    private readonly memberships: MembershipService,
    private readonly registration: RegistrationService,
  ) {}

  async list(tenant: TenantContext): Promise<UserImportSummary[]> {
    const imports = await this.importRepository.find({
      where: { tenant_id: tenant.tenantId },
      order: { created_at: 'DESC' },
    });
    const summaries: UserImportSummary[] = [];
    for (const imported of imports) {
      const rows = await this.rowRepository.find({
        where: { import_id: imported.id },
      });
      summaries.push(toImportSummary(imported, rows));
    }
    return summaries;
  }

  async get(
    tenant: TenantContext,
    importId: string,
  ): Promise<UserImportSummary> {
    const { imported, rows } = await this.requireImport(tenant, importId);
    return toImportSummary(imported, rows);
  }

  async listRows(
    tenant: TenantContext,
    importId: string,
  ): Promise<UserImportRowResult[]> {
    const { rows } = await this.requireImport(tenant, importId);
    return rows.map(toRowResult);
  }

  async preview(
    tenant: TenantContext,
    importId: string,
  ): Promise<{ import: UserImportSummary; rows: UserImportRowResult[] }> {
    const { imported, rows } = await this.requireImport(tenant, importId);
    if (
      imported.status !== UserImportStatus.VALIDATED &&
      imported.status !== UserImportStatus.CONFIRMED
    ) {
      throw new InvalidRequestException(
        'Import must be validated before preview',
      );
    }
    return {
      import: toImportSummary(imported, rows),
      rows: rows.map(toRowResult),
    };
  }

  async upload(
    tenant: TenantContext,
    uploadedByUserId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    defaultCommunityId: string | null,
  ): Promise<UserImportSummary> {
    await this.customers.requireActive(tenant.tenantId);
    this.assertCsvFile(file);
    if (defaultCommunityId) {
      await this.communities.get(tenant, defaultCommunityId);
    } else if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'communityId is required unless the caller has a tenant-level membership',
      );
    }

    let parsed;
    try {
      parsed = parseCsv(file.buffer.toString('utf8'));
    } catch (error) {
      if (error instanceof CsvParseError) {
        throw new InvalidRequestException(error.message);
      }
      throw error;
    }
    if (parsed.rows.length > USER_IMPORT_MAX_ROWS) {
      throw new InvalidRequestException(
        `CSV must contain at most ${USER_IMPORT_MAX_ROWS} data rows`,
      );
    }

    const detected = detectCanonicalMapping(parsed.headers);
    const mapping = mappingCoversIdentifier(detected) ? detected : null;

    const saved = await this.importRepository.save(
      this.importRepository.create({
        tenant_id: tenant.tenantId,
        uploaded_by_user_id: uploadedByUserId,
        default_community_id: defaultCommunityId,
        original_filename: file.originalname.slice(0, 255),
        status: mapping ? UserImportStatus.MAPPED : UserImportStatus.UPLOADED,
        headers: parsed.headers,
        column_mapping: mapping,
      }),
    );

    const rows = parsed.rows.map((row) =>
      this.rowRepository.create({
        import_id: saved.id,
        row_number: row.rowNumber,
        raw_data: row.values,
        status: UserImportRowStatus.PENDING,
      }),
    );
    await this.rowRepository.save(rows);

    this.logger.log({
      msg: 'user_import_uploaded',
      tenantId: tenant.tenantId,
      importId: saved.id,
      rows: rows.length,
    });
    return toImportSummary(saved, rows);
  }

  async map(
    tenant: TenantContext,
    importId: string,
    mapping: ImportColumnMapping,
  ): Promise<UserImportSummary> {
    const { imported, rows } = await this.requireImport(tenant, importId);
    this.assertMutable(imported);
    if (!mappingCoversIdentifier(mapping)) {
      throw new InvalidRequestException('Mapping must include email or mobile');
    }
    try {
      assertMappingHeaders(imported.headers, mapping);
    } catch (error) {
      throw new InvalidRequestException(
        error instanceof Error ? error.message : 'Invalid mapping',
      );
    }

    imported.column_mapping = mapping;
    imported.status = UserImportStatus.MAPPED;
    await this.importRepository.save(imported);
    for (const row of rows) {
      this.resetRow(row);
    }
    await this.rowRepository.save(rows);
    return toImportSummary(imported, rows);
  }

  async validate(
    tenant: TenantContext,
    importId: string,
  ): Promise<UserImportSummary> {
    const { imported, rows } = await this.requireImport(tenant, importId);
    this.assertMutable(imported);
    const mapping = this.requireMapping(imported);

    const seenExternalIds = new Map<string, number>();
    const seenEmails = new Map<string, number>();
    const seenMobiles = new Map<string, number>();

    for (const row of rows) {
      await this.validateRow(
        tenant,
        imported,
        row,
        mapping,
        seenExternalIds,
        seenEmails,
        seenMobiles,
      );
    }
    await this.rowRepository.save(rows);
    imported.status = UserImportStatus.VALIDATED;
    await this.importRepository.save(imported);
    this.logger.log({
      msg: 'user_import_validated',
      tenantId: tenant.tenantId,
      importId: imported.id,
    });
    return toImportSummary(imported, rows);
  }

  async confirm(
    tenant: TenantContext,
    importId: string,
  ): Promise<UserImportSummary> {
    const { imported, rows } = await this.requireImport(tenant, importId);
    if (imported.status === UserImportStatus.CONFIRMED) {
      return toImportSummary(imported, rows);
    }
    if (imported.status !== UserImportStatus.VALIDATED) {
      throw new InvalidRequestException(
        'Import must be validated before confirm',
      );
    }
    await this.customers.requireActive(tenant.tenantId);

    for (const row of rows) {
      if (row.status !== UserImportRowStatus.VALID) {
        continue;
      }
      await this.confirmRow(tenant, imported, row);
      await this.rowRepository.save(row);
    }

    imported.status = UserImportStatus.CONFIRMED;
    imported.confirmed_at = new Date();
    await this.importRepository.save(imported);
    this.logger.log({
      msg: 'user_import_confirmed',
      tenantId: tenant.tenantId,
      importId: imported.id,
    });
    return toImportSummary(imported, rows);
  }

  private async validateRow(
    tenant: TenantContext,
    imported: UserImport,
    row: UserImportRow,
    mapping: ImportColumnMapping,
    seenExternalIds: Map<string, number>,
    seenEmails: Map<string, number>,
    seenMobiles: Map<string, number>,
  ): Promise<void> {
    this.resetRow(row);
    const extracted = this.extractMappedFields(row.raw_data, mapping);
    row.external_id = extracted.externalId;
    row.first_name = extracted.firstName;
    row.last_name = extracted.lastName;
    row.display_name = extracted.displayName;

    if (extracted.email) {
      if (!EMAIL_PATTERN.test(extracted.email)) {
        this.markInvalid(row, 'INVALID_EMAIL', 'Invalid email');
        return;
      }
      row.email = this.credentials.normalizeEmail(extracted.email);
    }
    if (extracted.mobile) {
      try {
        row.mobile = this.credentials.normalizeMobile(extracted.mobile);
      } catch (error) {
        if (error instanceof InvalidPhoneNumberError) {
          this.markInvalid(row, 'INVALID_MOBILE', 'Invalid mobile number');
          return;
        }
        throw error;
      }
    }
    if (!row.email && !row.mobile) {
      this.markInvalid(
        row,
        'MISSING_IDENTIFIER',
        'Each row requires an email or mobile',
      );
      return;
    }

    const communityId =
      extracted.communityId ?? imported.default_community_id ?? null;
    if (extracted.communityId && !UUID_PATTERN.test(extracted.communityId)) {
      this.markInvalid(row, 'INVALID_COMMUNITY', 'community_id must be a UUID');
      return;
    }
    if (communityId) {
      try {
        await this.communities.get(tenant, communityId);
      } catch (error) {
        if (
          error instanceof ResourceNotFoundException ||
          error instanceof AccessForbiddenException
        ) {
          this.markInvalid(
            row,
            'INVALID_COMMUNITY',
            'Community not found in this customer',
          );
          return;
        }
        throw error;
      }
    } else if (!hasTenantLevelMembership(tenant.memberships)) {
      this.markInvalid(
        row,
        'COMMUNITY_REQUIRED',
        'community_id is required for this import',
      );
      return;
    }
    row.community_id = communityId;

    if (row.external_id) {
      const prior = seenExternalIds.get(row.external_id);
      if (prior !== undefined) {
        this.markInvalid(
          row,
          'DUPLICATE_ROW',
          `Duplicate external_id of row ${prior}`,
        );
        return;
      }
      seenExternalIds.set(row.external_id, row.row_number);
    }
    if (row.email) {
      const prior = seenEmails.get(row.email);
      if (prior !== undefined) {
        this.markInvalid(
          row,
          'DUPLICATE_ROW',
          `Duplicate email of row ${prior}`,
        );
        return;
      }
      seenEmails.set(row.email, row.row_number);
    }
    if (row.mobile) {
      const prior = seenMobiles.get(row.mobile);
      if (prior !== undefined) {
        this.markInvalid(
          row,
          'DUPLICATE_ROW',
          `Duplicate mobile of row ${prior}`,
        );
        return;
      }
      seenMobiles.set(row.mobile, row.row_number);
    }

    const emailIdentity = row.email
      ? await this.identities.findIdentity(IdentityType.EMAIL, row.email)
      : null;
    const mobileIdentity = row.mobile
      ? await this.identities.findIdentity(IdentityType.MOBILE, row.mobile)
      : null;
    const externalUserId = row.external_id
      ? await this.findResolvedUserByExternalId(
          tenant.tenantId,
          row.external_id,
        )
      : null;

    const decision = decideImportMatch({
      externalUserId,
      email: emailIdentity
        ? { userId: emailIdentity.userId, isActive: emailIdentity.isActive }
        : null,
      mobile: mobileIdentity
        ? { userId: mobileIdentity.userId, isActive: mobileIdentity.isActive }
        : null,
      emailInTenant: emailIdentity
        ? await this.userInTenant(emailIdentity.userId, tenant.tenantId)
        : false,
      mobileInTenant: mobileIdentity
        ? await this.userInTenant(mobileIdentity.userId, tenant.tenantId)
        : false,
    });

    if (decision.action === 'review') {
      row.status = UserImportRowStatus.REVIEW;
      row.error_code = decision.code ?? 'REVIEW';
      row.error_message = decision.message ?? 'Manual review required';
      return;
    }
    if (decision.action === 'match' && decision.userId) {
      row.resolved_user_id = decision.userId;
    }
    row.status = UserImportRowStatus.VALID;
  }

  private async confirmRow(
    tenant: TenantContext,
    imported: UserImport,
    row: UserImportRow,
  ): Promise<void> {
    try {
      if (row.resolved_user_id) {
        const membership = await this.ensureMembership(
          tenant,
          row.resolved_user_id,
          row.community_id,
        );
        row.resolved_membership_id = membership.id;
        row.status = UserImportRowStatus.MATCHED;
        return;
      }

      const created = await this.identities.createImportedAccount({
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name,
        identities: this.identitiesFromRow(row),
      });
      const membership = await this.ensureMembership(
        tenant,
        created.userId,
        row.community_id,
      );
      row.resolved_user_id = created.userId;
      row.resolved_membership_id = membership.id;
      row.status = UserImportRowStatus.CREATED;
      const inviteTo =
        created.identities.find(
          (identity) => identity.type === IdentityType.EMAIL,
        ) ?? created.identities[0];
      await this.registration.sendActivationInvitation(inviteTo.identifier);
      this.logger.log({
        msg: 'user_imported',
        tenantId: imported.tenant_id,
        importId: imported.id,
        userId: created.userId,
        rowNumber: row.row_number,
      });
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        row.status = UserImportRowStatus.REVIEW;
        row.error_code = 'EXISTING_IDENTITY';
        row.error_message = 'An existing account already uses this identifier';
        return;
      }
      if (
        error instanceof ResourceConflictException ||
        error instanceof ResourceNotFoundException ||
        error instanceof AccessForbiddenException ||
        error instanceof InvalidRequestException
      ) {
        row.status = UserImportRowStatus.INVALID;
        row.error_code = 'CONFIRM_FAILED';
        row.error_message =
          typeof error.message === 'string'
            ? error.message
            : 'Unable to confirm this row';
        return;
      }
      throw error;
    }
  }

  private identitiesFromRow(row: UserImportRow) {
    const identities: Array<{
      type: IdentityType;
      identifier: string;
      normalizedIdentifier: string;
    }> = [];
    if (row.email) {
      identities.push({
        type: IdentityType.EMAIL,
        identifier: row.email,
        normalizedIdentifier: row.email,
      });
    }
    if (row.mobile) {
      identities.push({
        type: IdentityType.MOBILE,
        identifier: row.mobile,
        normalizedIdentifier: row.mobile,
      });
    }
    return identities;
  }

  private async ensureMembership(
    tenant: TenantContext,
    userId: string,
    communityId: string | null,
  ): Promise<{ id: string }> {
    const existing = await this.memberships.listActiveForUserInTenant(
      userId,
      tenant.tenantId,
    );
    const match = existing.find(
      (membership) => membership.communityId === communityId,
    );
    if (match) {
      return { id: match.id };
    }
    try {
      const created = await this.memberships.create(tenant, {
        userId,
        communityId,
      });
      return { id: created.id };
    } catch (error) {
      if (error instanceof ResourceConflictException) {
        const retry = await this.memberships.listActiveForUserInTenant(
          userId,
          tenant.tenantId,
        );
        const found = retry.find(
          (membership) => membership.communityId === communityId,
        );
        if (found) {
          return { id: found.id };
        }
      }
      throw error;
    }
  }

  private async userInTenant(
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const memberships = await this.memberships.listActiveForUserInTenant(
      userId,
      tenantId,
    );
    return memberships.length > 0;
  }

  private async findResolvedUserByExternalId(
    tenantId: string,
    externalId: string,
  ): Promise<string | null> {
    const row = await this.rowRepository
      .createQueryBuilder('row')
      .innerJoin(UserImport, 'imp', 'imp.id = row.import_id')
      .where('imp.tenant_id = :tenantId', { tenantId })
      .andWhere('row.external_id = :externalId', { externalId })
      .andWhere('row.status IN (:...statuses)', {
        statuses: [UserImportRowStatus.CREATED, UserImportRowStatus.MATCHED],
      })
      .andWhere('row.resolved_user_id IS NOT NULL')
      .orderBy('row.created_at', 'ASC')
      .getOne();
    return row?.resolved_user_id ?? null;
  }

  private extractMappedFields(
    values: Record<string, string>,
    mapping: ImportColumnMapping,
  ) {
    return {
      email: mappedValue(values, mapping, 'email'),
      mobile: mappedValue(values, mapping, 'mobile'),
      externalId: mappedValue(values, mapping, 'externalId'),
      firstName: this.limit(mappedValue(values, mapping, 'firstName'), 100),
      lastName: this.limit(mappedValue(values, mapping, 'lastName'), 100),
      displayName: this.limit(mappedValue(values, mapping, 'displayName'), 255),
      communityId: mappedValue(values, mapping, 'communityId'),
    };
  }

  private limit(value: string | null, max: number): string | null {
    if (!value) {
      return null;
    }
    return value.slice(0, max);
  }

  private resetRow(row: UserImportRow): void {
    if (TERMINAL_ROW_STATUSES.has(row.status)) {
      return;
    }
    row.status = UserImportRowStatus.PENDING;
    row.error_code = null;
    row.error_message = null;
    row.resolved_user_id = null;
    row.resolved_membership_id = null;
    row.external_id = null;
    row.email = null;
    row.mobile = null;
    row.first_name = null;
    row.last_name = null;
    row.display_name = null;
    row.community_id = null;
  }

  private markInvalid(row: UserImportRow, code: string, message: string): void {
    row.status = UserImportRowStatus.INVALID;
    row.error_code = code;
    row.error_message = message;
  }

  private requireMapping(imported: UserImport): ImportColumnMapping {
    const mapping = imported.column_mapping as ImportColumnMapping | null;
    if (!mapping || !mappingCoversIdentifier(mapping)) {
      throw new InvalidRequestException(
        'Column mapping is required before validation',
      );
    }
    return mapping;
  }

  private assertMutable(imported: UserImport): void {
    if (imported.status === UserImportStatus.CONFIRMED) {
      throw new InvalidRequestException('Confirmed imports cannot be changed');
    }
  }

  private async requireImport(
    tenant: TenantContext,
    importId: string,
  ): Promise<{ imported: UserImport; rows: UserImportRow[] }> {
    const imported = await this.importRepository.findOne({
      where: { id: importId, tenant_id: tenant.tenantId },
    });
    if (!imported) {
      throw new ResourceNotFoundException('User import not found');
    }
    const rows = await this.rowRepository.find({
      where: { import_id: imported.id },
      order: { row_number: 'ASC' },
    });
    return { imported, rows };
  }

  private assertCsvFile(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): void {
    if (!file?.buffer || file.size === 0) {
      throw new InvalidRequestException('CSV file is required');
    }
    if (file.size > USER_IMPORT_MAX_FILE_BYTES) {
      throw new InvalidRequestException(
        `CSV file must be at most ${USER_IMPORT_MAX_FILE_BYTES} bytes`,
      );
    }
    const name = file.originalname.toLowerCase();
    const mime = file.mimetype.toLowerCase();
    const looksLikeCsv =
      name.endsWith('.csv') ||
      mime.includes('csv') ||
      mime === 'text/plain' ||
      mime === 'application/octet-stream';
    if (!looksLikeCsv) {
      throw new InvalidRequestException('File must be a CSV');
    }
  }
}
