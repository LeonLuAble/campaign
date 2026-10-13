import { describe, expect, it } from 'vitest';
import { CsvParseError, parseCsv } from './csv.js';

describe('parseCsv', () => {
  it('parses headers and data rows', () => {
    const parsed = parseCsv('email,mobile\nMei@example.com,0123456789\n');
    expect(parsed.headers).toEqual(['email', 'mobile']);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        values: { email: 'Mei@example.com', mobile: '0123456789' },
      },
    ]);
  });

  it('keeps quoted commas and strips a BOM', () => {
    const parsed = parseCsv('\uFEFFname,note\n"Lin, Mei","said ""hello"""\n');
    expect(parsed.rows[0].values).toEqual({
      name: 'Lin, Mei',
      note: 'said "hello"',
    });
  });

  it('skips blank rows', () => {
    const parsed = parseCsv('email\na@example.com\n\nb@example.com\n');
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual([2, 4]);
  });

  it('rejects empty files and duplicate headers', () => {
    expect(() => parseCsv('')).toThrow(CsvParseError);
    expect(() => parseCsv('email,email\na@example.com,b@example.com')).toThrow(
      /unique/,
    );
  });
});
