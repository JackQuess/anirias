type UnknownRecord = Record<string, unknown>;

const UPCOMING_BOOL_KEYS = ['isUpcoming', 'is_upcoming', 'upcoming'] as const;
const UPCOMING_DATE_KEYS = [
  'startDate',
  'start_date',
  'airDate',
  'air_date',
  'releaseDate',
  'release_date',
  'nextAiringAt',
  'next_airing_at',
  'seasonStartDate',
  'season_start_date',
] as const;
const UPCOMING_YEAR_KEYS = ['seasonYear', 'season_year', 'year'] as const;

export interface UpcomingOptions {
  fallbackDate?: string | number | Date | null;
  fallbackYear?: number | null;
}

export interface UpcomingInfo {
  isUpcoming: boolean;
  date: Date | null;
}

function asRecord(input: unknown): UnknownRecord | null {
  if (!input || typeof input !== 'object') return null;
  return input as UnknownRecord;
}

function coerceDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    // Handles both unix seconds and unix milliseconds.
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // AniList-like shape: { year, month, day }.
  const obj = asRecord(value);
  if (!obj) return null;
  const year = Number(obj.year);
  const month = Number(obj.month || 1);
  const day = Number(obj.day || 1);
  if (!Number.isFinite(year) || year < 1900) return null;
  const d = new Date(year, Math.max(1, month) - 1, Math.max(1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickFirstDate(source: UnknownRecord): Date | null {
  for (const key of UPCOMING_DATE_KEYS) {
    if (!(key in source)) continue;
    const parsed = coerceDate(source[key]);
    if (parsed) return parsed;
  }
  return null;
}

function pickYearDate(source: UnknownRecord): Date | null {
  for (const key of UPCOMING_YEAR_KEYS) {
    if (!(key in source)) continue;
    const y = Number(source[key]);
    if (Number.isFinite(y) && y >= 1900) return new Date(y, 0, 1);
  }
  return null;
}

export function getUpcomingInfo(input: unknown, options?: UpcomingOptions): UpcomingInfo {
  const now = Date.now();
  const record = asRecord(input);

  if (record) {
    for (const key of UPCOMING_BOOL_KEYS) {
      if (!(key in record)) continue;
      const value = record[key];
      if (typeof value !== 'boolean') continue;
      const directDate =
        pickFirstDate(record) ||
        pickYearDate(record) ||
        coerceDate(options?.fallbackDate) ||
        (options?.fallbackYear ? new Date(options.fallbackYear, 0, 1) : null);
      return { isUpcoming: value, date: directDate };
    }
  }

  const inferredDate =
    (record ? pickFirstDate(record) : null) ||
    (record ? pickYearDate(record) : null) ||
    coerceDate(options?.fallbackDate) ||
    (options?.fallbackYear ? new Date(options.fallbackYear, 0, 1) : null);

  return {
    isUpcoming: Boolean(inferredDate && inferredDate.getTime() > now),
    date: inferredDate,
  };
}

export function formatUpcomingMonth(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
}
