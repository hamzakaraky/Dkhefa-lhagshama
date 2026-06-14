import { helpedCount, localMidnightUtc, type RawCounts } from './dashboardStats';

describe('helpedCount', () => {
  it('sums closed + referred', () => {
    expect(helpedCount({ closedRequests: 3, referredRequests: 2 } as RawCounts)).toBe(5);
  });

  it('treats missing buckets as zero', () => {
    expect(helpedCount({} as RawCounts)).toBe(0);
  });
});

describe('localMidnightUtc', () => {
  it('returns the UTC instant of local midnight for a given now in a +03:00 zone', () => {
    // 2026-06-14T10:30:00 local (+180 min offset) → local midnight = 2026-06-13T21:00:00Z
    const now = new Date('2026-06-14T07:30:00.000Z'); // == 10:30 local at +180
    const midnight = localMidnightUtc(now, -180); // getTimezoneOffset returns -180 for +03:00
    expect(midnight.toISOString()).toBe('2026-06-13T21:00:00.000Z');
  });

  it('is idempotent at exactly local midnight', () => {
    const now = new Date('2026-06-13T21:00:00.000Z');
    const midnight = localMidnightUtc(now, -180);
    expect(midnight.toISOString()).toBe('2026-06-13T21:00:00.000Z');
  });
});
