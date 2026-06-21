/**
 * Insights time-range presets. `rangeToSinceMs` returns the epoch-ms lower bound
 * for a preset, or `null` for `all`/unknown (meaning "no lower bound — include
 * everything"). Pure + injectable `nowMs` so it's deterministic to unit-test.
 */
const DAY_MS = 86_400_000;

const PRESET_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

export const INSIGHTS_RANGES = ['7d', '30d', '90d', '12m', 'all', 'custom'] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];

export function rangeToSinceMs(range: string, nowMs: number): number | null {
  const days = PRESET_DAYS[range];
  return days ? nowMs - days * DAY_MS : null;
}

/**
 * Resolve a request's `?range=` preset OR a custom `?from=YYYY-MM-DD&to=YYYY-MM-DD`
 * window into inclusive [sinceMs, untilMs] bounds (either may be null = unbounded).
 * A custom range (at least one valid from/to) takes precedence over a preset.
 */
export function resolveRange(
  q: { range?: unknown; from?: unknown; to?: unknown },
  nowMs: number,
): { sinceMs: number | null; untilMs: number | null } {
  const from = typeof q.from === 'string' ? Date.parse(`${q.from}T00:00:00Z`) : NaN;
  const to = typeof q.to === 'string' ? Date.parse(`${q.to}T23:59:59.999Z`) : NaN;
  if (!Number.isNaN(from) || !Number.isNaN(to)) {
    return {
      sinceMs: Number.isNaN(from) ? null : from,
      untilMs: Number.isNaN(to) ? null : to,
    };
  }
  return { sinceMs: rangeToSinceMs(String(q.range ?? 'all'), nowMs), untilMs: null };
}
