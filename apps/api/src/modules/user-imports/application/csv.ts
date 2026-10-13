export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

export interface ParsedCsv {
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
}

export function parseCsv(input: string): ParsedCsv {
  const text = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const records = parseRecords(text);
  if (records.length === 0) {
    throw new CsvParseError('CSV is empty');
  }

  const headers = records[0].map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    throw new CsvParseError('CSV header row is required');
  }
  if (headers.some((header) => header.length === 0)) {
    throw new CsvParseError('CSV headers must not be blank');
  }

  const normalized = headers.map((header) => header.toLowerCase());
  if (new Set(normalized).size !== headers.length) {
    throw new CsvParseError('CSV headers must be unique');
  }

  const rows: ParsedCsv['rows'] = [];
  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];
    if (record.every((value) => value.trim().length === 0)) {
      continue;
    }
    const values: Record<string, string> = {};
    for (let column = 0; column < headers.length; column += 1) {
      values[headers[column]] = (record[column] ?? '').trim();
    }
    rows.push({ rowNumber: index + 1, values });
  }

  if (rows.length === 0) {
    throw new CsvParseError('CSV contains no data rows');
  }

  return { headers, rows };
}

function parseRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }
    if (character === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += character;
  }

  if (inQuotes) {
    throw new CsvParseError('CSV has an unterminated quoted field');
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
