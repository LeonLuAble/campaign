import { describe, expect, it } from 'vitest';
import {
  csvContainsContactPii,
  emptyReportCsvRow,
  serializeCsv,
} from './report-csv.js';

describe('report CSV', () => {
  it('serializes aggregate rows without contact PII columns', () => {
    const csv = serializeCsv([
      emptyReportCsvRow({
        rowType: 'progress',
        scope: 'campaign',
        customerId: 'tenant-1',
        campaignId: 'campaign-1',
        timezone: 'Asia/Kuala_Lumpur',
        generatedAt: '2026-10-13T00:00:00.000Z',
        participantCount: '2',
        unit: 'days',
        achievedValue: '4',
        targetValue: '10',
      }),
    ]);
    expect(csv).toContain('rowType,scope,customerId');
    expect(csv).toContain('campaign');
    expect(csv).not.toContain('email');
    expect(csv).not.toContain('mobile');
    expect(csv).not.toContain('displayName');
    expect(csvContainsContactPii(csv)).toBe(false);
  });

  it('detects contact PII if it leaked into a cell', () => {
    expect(csvContainsContactPii('member@example.com')).toBe(true);
    expect(csvContainsContactPii('+60123456789')).toBe(true);
  });
});
