import type { ImportColumnMapping } from './import-mapping.js';
import {
  UserImportRow,
  UserImportRowStatus,
} from '../domain/user-import-row.entity.js';
import { UserImport } from '../domain/user-import.entity.js';

export interface UserImportSummary {
  id: string;
  customerId: string;
  communityId: string | null;
  originalFilename: string;
  status: string;
  headers: string[];
  mapping: ImportColumnMapping | null;
  counts: {
    total: number;
    pending: number;
    valid: number;
    invalid: number;
    review: number;
    created: number;
    matched: number;
  };
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
}

export interface UserImportRowResult {
  id: string;
  rowNumber: number;
  rawData: Record<string, string>;
  externalId: string | null;
  email: string | null;
  mobile: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  communityId: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  resolvedUserId: string | null;
  resolvedMembershipId: string | null;
}

export function toImportSummary(
  imported: UserImport,
  rows: UserImportRow[],
): UserImportSummary {
  const counts = {
    total: rows.length,
    pending: 0,
    valid: 0,
    invalid: 0,
    review: 0,
    created: 0,
    matched: 0,
  };
  for (const row of rows) {
    switch (row.status) {
      case UserImportRowStatus.PENDING:
        counts.pending += 1;
        break;
      case UserImportRowStatus.VALID:
        counts.valid += 1;
        break;
      case UserImportRowStatus.INVALID:
        counts.invalid += 1;
        break;
      case UserImportRowStatus.REVIEW:
        counts.review += 1;
        break;
      case UserImportRowStatus.CREATED:
        counts.created += 1;
        break;
      case UserImportRowStatus.MATCHED:
        counts.matched += 1;
        break;
      default:
        break;
    }
  }

  return {
    id: imported.id,
    customerId: imported.tenant_id,
    communityId: imported.default_community_id,
    originalFilename: imported.original_filename,
    status: imported.status,
    headers: imported.headers,
    mapping: imported.column_mapping as ImportColumnMapping | null,
    counts,
    createdAt: imported.created_at.toISOString(),
    updatedAt: imported.updated_at.toISOString(),
    confirmedAt: imported.confirmed_at?.toISOString() ?? null,
  };
}

export function toRowResult(row: UserImportRow): UserImportRowResult {
  return {
    id: row.id,
    rowNumber: row.row_number,
    rawData: row.raw_data,
    externalId: row.external_id,
    email: row.email,
    mobile: row.mobile,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    communityId: row.community_id,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    resolvedUserId: row.resolved_user_id,
    resolvedMembershipId: row.resolved_membership_id,
  };
}
