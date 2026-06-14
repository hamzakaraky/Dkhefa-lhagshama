import {
  AVAILABILITY_DAYS,
  isValidWindow,
  isReturnDatePast,
  windowsCoverBefore,
  type AvailabilityWindow,
} from './availability';

describe('availability.isValidWindow', () => {
  it('accepts a well-formed window', () => {
    expect(isValidWindow({ day: 0, start: '09:00', end: '17:00' })).toBe(true);
    expect(isValidWindow({ day: 6, start: '00:00', end: '23:59' })).toBe(true);
  });
  it('rejects out-of-range day', () => {
    expect(isValidWindow({ day: 7, start: '09:00', end: '10:00' })).toBe(false);
    expect(isValidWindow({ day: -1, start: '09:00', end: '10:00' })).toBe(false);
  });
  it('rejects malformed times', () => {
    expect(isValidWindow({ day: 1, start: '9:00', end: '10:00' })).toBe(false);
    expect(isValidWindow({ day: 1, start: '24:00', end: '25:00' })).toBe(false);
    expect(isValidWindow({ day: 1, start: '09:60', end: '10:00' })).toBe(false);
  });
  it('rejects end <= start', () => {
    expect(isValidWindow({ day: 1, start: '17:00', end: '09:00' })).toBe(false);
    expect(isValidWindow({ day: 1, start: '10:00', end: '10:00' })).toBe(false);
  });
});

describe('availability.isReturnDatePast', () => {
  const now = Date.parse('2026-06-14T12:00:00.000Z');
  it('true for a date strictly before today', () => {
    expect(isReturnDatePast('2026-06-13', now)).toBe(true);
  });
  it('false for today or a future date', () => {
    expect(isReturnDatePast('2026-06-14', now)).toBe(false);
    expect(isReturnDatePast('2026-06-20', now)).toBe(false);
  });
  it('false for null / malformed', () => {
    expect(isReturnDatePast(null, now)).toBe(false);
    expect(isReturnDatePast('not-a-date', now)).toBe(false);
  });
});

describe('availability.windowsCoverBefore', () => {
  const windows: AvailabilityWindow[] = [
    { day: 1, start: '09:00', end: '17:00' }, // Monday
    { day: 3, start: '18:00', end: '20:00' }, // Wednesday
  ];
  it('true when a window day falls on/before the deadline', () => {
    // deadline Tuesday 2026-06-16 → the Monday window (2026-06-15) precedes it
    expect(windowsCoverBefore(windows, '2026-06-16', Date.parse('2026-06-14T00:00:00Z'))).toBe(true);
  });
  it('false when no window day occurs before the deadline', () => {
    // deadline is the same Sunday, before any Mon/Wed window in the next 7 days
    expect(windowsCoverBefore(windows, '2026-06-14', Date.parse('2026-06-14T00:00:00Z'))).toBe(false);
  });
  it('false for empty windows or null deadline', () => {
    expect(windowsCoverBefore([], '2026-06-16', Date.parse('2026-06-14T00:00:00Z'))).toBe(false);
    expect(windowsCoverBefore(windows, null, Date.parse('2026-06-14T00:00:00Z'))).toBe(false);
  });
  it('exports 7 day labels keyed 0-6', () => {
    expect(AVAILABILITY_DAYS).toHaveLength(7);
  });
});
