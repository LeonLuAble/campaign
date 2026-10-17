/// Canonical CSV fields for user import (mirrors API import-mapping.ts).
const canonicalImportFields = <String>[
  'email',
  'mobile',
  'externalId',
  'firstName',
  'lastName',
  'displayName',
  'communityId',
  'communityPath',
];

const _headerAliases = <String, String>{
  'email': 'email',
  'mobile': 'mobile',
  'external_id': 'externalId',
  'externalid': 'externalId',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'display_name': 'displayName',
  'displayname': 'displayName',
  'community_id': 'communityId',
  'communityid': 'communityId',
  'community_path': 'communityPath',
  'communitypath': 'communityPath',
};

String normalizeImportHeader(String header) {
  return header.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '_');
}

/// Auto-suggest mapping from CSV headers to canonical fields.
Map<String, String> detectCanonicalMapping(List<String> headers) {
  final mapping = <String, String>{};
  for (final header in headers) {
    final field = _headerAliases[normalizeImportHeader(header)];
    if (field != null && !mapping.containsKey(field)) {
      mapping[field] = header;
    }
  }
  return mapping;
}

bool mappingCoversIdentifier(Map<String, String> mapping) {
  final email = mapping['email']?.trim() ?? '';
  final mobile = mapping['mobile']?.trim() ?? '';
  return email.isNotEmpty || mobile.isNotEmpty;
}

/// Template CSV used by the Imports wizard (en headers).
const importTemplateCsv =
    'external_id,email,mobile,display_name,communityPath\n'
    ',member@example.com,,Example Member,Region/Branch\n';

bool looksLikeCsvFilename(String name) {
  final lower = name.trim().toLowerCase();
  return lower.endsWith('.csv');
}

bool isEmptyCsvBytes(List<int> bytes) {
  if (bytes.isEmpty) {
    return true;
  }
  final text = String.fromCharCodes(bytes).trim();
  return text.isEmpty;
}

List<String> parseCsvHeaders(List<int> bytes) {
  final text = String.fromCharCodes(bytes);
  final firstLine = text
      .split(RegExp(r'\r?\n'))
      .map((line) => line.trim())
      .firstWhere((line) => line.isNotEmpty, orElse: () => '');
  if (firstLine.isEmpty) {
    return const [];
  }
  return firstLine.split(',').map((part) => part.trim()).toList();
}
