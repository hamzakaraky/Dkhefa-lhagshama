/**
 * Volunteer recurring-availability helpers (WS-7). Pure + unit-tested; no
 * Firestore. `day` is 0=Sunday … 6=Saturday (JS Date.getUTCDay convention).
 * Times are 24h "HH:MM". The matcher (matchVolunteers) and the volunteerApp
 * read endpoint both consume these.
 */
export interface AvailabilityWindow {
  day: number;
  start: string;
  end: string;
}

/** 0=Sun … 6=Sat. Index = the `day` field. */
export const AVAILABILITY_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** A window is valid when day∈0..6, both times match HH:MM, and end > start. */
export function isValidWindow(w: AvailabilityWindow): boolean {
  if (typeof w.day !== 'number' || w.day < 0 || w.day > 6) return false;
  if (!HHMM.test(w.start) || !HHMM.test(w.end)) return false;
  return toMinutes(w.end) > toMinutes(w.start);
}

/** True when an ISO date (YYYY-MM-DD) is strictly before `now`'s calendar day. */
export function isReturnDatePast(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return false;
  const nowDay = Math.floor(now / 86_400_000);
  const isoDay = Math.floor(ms / 86_400_000);
  return isoDay < nowDay;
}

/**
 * True when at least one weekly window falls on a calendar day that is on or
 * before the request deadline, scanning the 7 days from `now`. Used by the
 * matcher's availability boost ("available before the deadline").
 */
export function windowsCoverBefore(
  windows: AvailabilityWindow[],
  deadline: string | null | undefined,
  now: number,
): boolean {
  if (!windows.length || !deadline) return false;
  const deadlineMs = Date.parse(deadline);
  if (Number.isNaN(deadlineMs)) return false;
  const days = new Set(windows.map((w) => w.day));
  for (let i = 0; i < 7; i += 1) {
    const ms = now + i * 86_400_000;
    if (ms > deadlineMs) break;
    if (days.has(new Date(ms).getUTCDay())) return true;
  }
  return false;
}
