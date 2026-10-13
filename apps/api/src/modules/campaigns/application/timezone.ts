import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertIanaTimeZone(value: string): string {
  const timezone = value.trim();
  if (!timezone) {
    throw new InvalidRequestException('timezone is required');
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new InvalidRequestException(
      'timezone must be a valid IANA time zone',
    );
  }
  return timezone;
}

export function parseIsoDate(value: string, field: string): string {
  const match = ISO_DATE.exec(value.trim());
  if (!match) {
    throw new InvalidRequestException(
      `${field} must be an ISO date (YYYY-MM-DD)`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new InvalidRequestException(`${field} must be a valid calendar date`);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function toIsoDate(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarDateInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new InvalidRequestException(
      'Unable to resolve a calendar date for the campaign timezone',
    );
  }
  return `${year}-${month}-${day}`;
}

export function resolveOccurredOn(
  value: string | undefined,
  timeZone: string,
  now = new Date(),
): string {
  const today = calendarDateInTimeZone(now, timeZone);
  const occurredOn = value ? parseIsoDate(value, 'occurredOn') : today;
  if (occurredOn > today) {
    throw new InvalidRequestException(
      'occurredOn cannot be in the future in the campaign timezone',
    );
  }
  return occurredOn;
}

export function assertOccurredOnInCampaignWindow(
  occurredOn: string,
  startsOn: string | null,
  endsOn: string | null,
): void {
  if (startsOn && occurredOn < startsOn) {
    throw new InvalidRequestException(
      'occurredOn cannot be before the campaign start date',
    );
  }
  if (endsOn && occurredOn > endsOn) {
    throw new InvalidRequestException(
      'occurredOn cannot be after the campaign end date',
    );
  }
}

export function assertDateOrder(
  startsOn: string | null,
  endsOn: string | null,
): void {
  if (startsOn && endsOn && endsOn < startsOn) {
    throw new InvalidRequestException('endsOn must be on or after startsOn');
  }
}

export function inclusiveIsoDateCount(
  startsOn: string,
  endsOn: string,
): number {
  const start = Date.UTC(
    Number(startsOn.slice(0, 4)),
    Number(startsOn.slice(5, 7)) - 1,
    Number(startsOn.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(endsOn.slice(0, 4)),
    Number(endsOn.slice(5, 7)) - 1,
    Number(endsOn.slice(8, 10)),
  );
  return Math.floor((end - start) / 86_400_000) + 1;
}

const MAX_SETTINGS_BYTES = 16_384;

export function normalizeSettings(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRequestException('configuration must be a JSON object');
  }
  const settings = value as Record<string, unknown>;
  const encoded = Buffer.byteLength(JSON.stringify(settings), 'utf8');
  if (encoded > MAX_SETTINGS_BYTES) {
    throw new InvalidRequestException('configuration is too large');
  }
  return settings;
}
