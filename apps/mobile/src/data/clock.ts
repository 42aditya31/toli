// Time helpers. Timestamps stay UTC; only day boundaries use the trip's time zone (03 §4.1).
import { getCalendars } from 'expo-localization';

export const nowIso = () => new Date().toISOString();

export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? 'Asia/Kolkata';
}

/** "2026-10-13" for an instant, in a time zone. */
export function dayIn(timeZone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  return parts;
}

export function timeIn(timeZone: string, iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 – 15 Oct", "28 Oct – 2 Nov", "12 Oct" (the prototype's date line). */
export function dateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const [, sm, sd] = start.split('-').map(Number) as [number, number, number];
  if (!end || end === start) return `${sd} ${MONTHS[sm - 1]}`;
  const [, em, ed] = end.split('-').map(Number) as [number, number, number];
  return sm === em
    ? `${sd} – ${ed} ${MONTHS[em - 1]}`
    : `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Day d of n (1-based), or null without dates. */
export function tripDay(
  start: string | null,
  end: string | null,
  today: string,
): { day: number; of: number } | null {
  if (!start || !end) return null;
  const of = daysBetween(start, end) + 1;
  const day = Math.min(of, Math.max(1, daysBetween(start, today) + 1));
  return { day, of };
}

export function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]}`;
}
