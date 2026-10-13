const REPORT_COLUMNS = [
  'rowType',
  'scope',
  'customerId',
  'campaignId',
  'communityId',
  'participationId',
  'userId',
  'timezone',
  'generatedAt',
  'participantCount',
  'committedParticipantCount',
  'unit',
  'achievedValue',
  'targetValue',
  'completionPercent',
  'completionStatus',
  'sourceUnit',
  'quantity',
  'outcomeMetric',
  'outcomeValue',
  'outcomeUnit',
] as const;

export type ReportCsvColumn = (typeof REPORT_COLUMNS)[number];

export type ReportCsvRow = Record<ReportCsvColumn, string>;

export function emptyReportCsvRow(
  base: Partial<ReportCsvRow> &
    Pick<
      ReportCsvRow,
      'scope' | 'customerId' | 'campaignId' | 'timezone' | 'generatedAt'
    >,
): ReportCsvRow {
  const empty = Object.fromEntries(
    REPORT_COLUMNS.map((column) => [column, '']),
  ) as ReportCsvRow;
  return { ...empty, ...base };
}

export function serializeCsv(rows: ReportCsvRow[]): string {
  const header = REPORT_COLUMNS.join(',');
  const body = rows.map((row) =>
    REPORT_COLUMNS.map((column) => escapeCsv(row[column])).join(','),
  );
  return [header, ...body].join('\n') + '\n';
}

export function csvContainsContactPii(csv: string): boolean {
  return /@|\+\d{6,}/.test(csv);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export { REPORT_COLUMNS };
