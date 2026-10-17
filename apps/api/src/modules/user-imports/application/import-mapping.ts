export const CANONICAL_IMPORT_FIELDS = [
  'email',
  'mobile',
  'externalId',
  'firstName',
  'lastName',
  'displayName',
  'communityId',
  'communityPath',
] as const;

export type CanonicalImportField = (typeof CANONICAL_IMPORT_FIELDS)[number];

export type ImportColumnMapping = Partial<Record<CanonicalImportField, string>>;

const HEADER_ALIASES: Record<string, CanonicalImportField> = {
  email: 'email',
  mobile: 'mobile',
  external_id: 'externalId',
  first_name: 'firstName',
  last_name: 'lastName',
  display_name: 'displayName',
  community_id: 'communityId',
  community_path: 'communityPath',
  communitypath: 'communityPath',
};

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

export function detectCanonicalMapping(headers: string[]): ImportColumnMapping {
  const mapping: ImportColumnMapping = {};
  for (const header of headers) {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field && mapping[field] === undefined) {
      mapping[field] = header;
    }
  }
  return mapping;
}

export function mappingCoversIdentifier(mapping: ImportColumnMapping): boolean {
  return Boolean(mapping.email || mapping.mobile);
}

export function mappedValue(
  values: Record<string, string>,
  mapping: ImportColumnMapping,
  field: CanonicalImportField,
): string | null {
  const header = mapping[field];
  if (!header) {
    return null;
  }
  const value = values[header];
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assertMappingHeaders(
  headers: string[],
  mapping: ImportColumnMapping,
): void {
  const headerSet = new Set(headers);
  for (const [field, header] of Object.entries(mapping) as Array<
    [CanonicalImportField, string | undefined]
  >) {
    if (!header) {
      continue;
    }
    if (!headerSet.has(header)) {
      throw new Error(
        `Mapping for ${field} references unknown column "${header}"`,
      );
    }
  }
}
