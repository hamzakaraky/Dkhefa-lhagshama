import { rangeToSinceMs, resolveRange } from './insightsRange';

const NOW = Date.UTC(2026, 5, 21); // 2026-06-21
const DAY = 86_400_000;

describe('rangeToSinceMs', () => {
  it('7d -> 7 days before now', () => {
    expect(rangeToSinceMs('7d', NOW)).toBe(NOW - 7 * DAY);
  });
  it('30d -> 30 days before now', () => {
    expect(rangeToSinceMs('30d', NOW)).toBe(NOW - 30 * DAY);
  });
  it('90d -> 90 days before now', () => {
    expect(rangeToSinceMs('90d', NOW)).toBe(NOW - 90 * DAY);
  });
  it('12m -> 365 days before now', () => {
    expect(rangeToSinceMs('12m', NOW)).toBe(NOW - 365 * DAY);
  });
  it('all -> null (no lower bound)', () => {
    expect(rangeToSinceMs('all', NOW)).toBeNull();
  });
  it('unknown value -> null', () => {
    expect(rangeToSinceMs('xyz', NOW)).toBeNull();
  });
});

describe('resolveRange', () => {
  it('preset range -> sinceMs from preset, untilMs null', () => {
    expect(resolveRange({ range: '30d' }, NOW)).toEqual({ sinceMs: NOW - 30 * DAY, untilMs: null });
  });
  it('all -> both null', () => {
    expect(resolveRange({ range: 'all' }, NOW)).toEqual({ sinceMs: null, untilMs: null });
  });
  it('custom from+to -> inclusive day bounds (precedence over range)', () => {
    const r = resolveRange({ range: '7d', from: '2026-06-01', to: '2026-06-10' }, NOW);
    expect(r.sinceMs).toBe(Date.parse('2026-06-01T00:00:00Z'));
    expect(r.untilMs).toBe(Date.parse('2026-06-10T23:59:59.999Z'));
  });
  it('custom from only -> sinceMs set, untilMs null', () => {
    const r = resolveRange({ from: '2026-06-01' }, NOW);
    expect(r.sinceMs).toBe(Date.parse('2026-06-01T00:00:00Z'));
    expect(r.untilMs).toBeNull();
  });
});
