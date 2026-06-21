import { useLanguage } from '@/contexts/LanguageContext'

/** Time-range presets + a custom from/to window, shared by the insights dashboards. */
export const INSIGHTS_RANGES = ['7d', '30d', '90d', '12m', 'all', 'custom'] as const
export type InsightsRange = (typeof INSIGHTS_RANGES)[number]

export default function InsightsRangeSelect({
  value,
  onChange,
  from,
  to,
  onDates,
}: {
  value: InsightsRange
  onChange: (r: InsightsRange) => void
  from: string
  to: string
  onDates: (from: string, to: string) => void
}) {
  const { t } = useLanguage()
  const r = t.common.insightsRange
  const LABELS: Record<InsightsRange, string> = {
    '7d': r.d7,
    '30d': r.d30,
    '90d': r.d90,
    '12m': r.m12,
    all: r.all,
    custom: r.custom,
  }
  return (
    <div className="insights-range-wrap">
      <div className="insights-range" role="group" aria-label={r.label}>
        {INSIGHTS_RANGES.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`insights-range-opt${value === opt ? ' is-active' : ''}`}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
          >
            {LABELS[opt]}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="insights-range-custom">
          <label className="insights-range-date">
            <span>{r.from}</span>
            <input
              type="date"
              className="form-input"
              value={from}
              max={to || undefined}
              onChange={(e) => onDates(e.target.value, to)}
            />
          </label>
          <label className="insights-range-date">
            <span>{r.to}</span>
            <input
              type="date"
              className="form-input"
              value={to}
              min={from || undefined}
              onChange={(e) => onDates(from, e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
