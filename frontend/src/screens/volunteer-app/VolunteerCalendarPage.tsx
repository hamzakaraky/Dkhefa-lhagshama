import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCategories } from '@/hooks/useCategories'
import { apiJson } from '@/lib/apiClient'
import { formatDate } from '@/utils/helpers'
import type { VolunteerMe } from '@/types'
import VolunteerLayout from '@/components/volunteer-app/VolunteerLayout'
import { ErrorState } from '@/components/admin/AdminUI'
import AvailabilityEditor from '@/components/volunteer-app/AvailabilityEditor'

interface AssignedItem {
  id: string
  title?: string
  category?: string
  deadline?: string | null
}

interface AssignedResponse {
  items: AssignedItem[]
}

export default function VolunteerCalendarPage() {
  const { t, lang } = useLanguage()
  const v = t.volunteerApp
  const c = v.calendar
  const { labelFor } = useCategories()

  const [me, setMe] = useState<VolunteerMe | null>(null)
  const [assigned, setAssigned] = useState<AssignedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Month cursor: first day of the month being shown.
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meData, assignedData] = await Promise.all([
        apiJson<VolunteerMe>('/api/volunteer/me'),
        apiJson<AssignedResponse>('/api/volunteer/assigned'),
      ])
      setMe(meData)
      setAssigned(assignedData.items ?? [])
    } catch {
      setError(v.ui.loadError)
    } finally {
      setLoading(false)
    }
  }, [v.ui.loadError])

  useEffect(() => {
    load()
  }, [load])

  // Deadlines keyed by YYYY-MM-DD for O(1) day lookups in the grid.
  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, AssignedItem[]>()
    for (const item of assigned) {
      if (!item.deadline) continue
      const key = item.deadline.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    }
    return map
  }, [assigned])

  // Set of weekday indices (0-6) the volunteer has any window on.
  const availableDows = useMemo(() => {
    const set = new Set<number>()
    for (const w of me?.availabilityWindows ?? []) set.add(w.day)
    return set
  }, [me])

  // Build the 6x7 grid cells (leading pad days + the month's days).
  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDow = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out: { date: Date | null }[] = []
    for (let i = 0; i < firstDow; i += 1) out.push({ date: null })
    for (let d = 1; d <= daysInMonth; d += 1) out.push({ date: new Date(year, month, d) })
    while (out.length % 7 !== 0) out.push({ date: null })
    return out
  }, [cursor])

  const todayKey = new Date().toISOString().slice(0, 10)
  const monthLabel = cursor.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (delta: number) =>
    setCursor((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1))

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return (
    <VolunteerLayout title={c.title} subtitle={c.subtitle}>
      {error && (
        <div style={{ marginBlockEnd: 'var(--sp-5)' }}>
          <ErrorState message={error} onRetry={load} retryLabel={v.ui.retry} />
        </div>
      )}

      {/* ── Month calendar ─────────────────────────────────────── */}
      <section className="card volapp-panel" aria-busy={loading}>
        <div className="volapp-cal-toolbar">
          <h2 className="volapp-cal-month">{monthLabel}</h2>
          <div className="volapp-cal-nav">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label={c.monthsBack}
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label={c.monthsFwd}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="volapp-cal-grid" role="grid" aria-label={c.title}>
          {(c.days as readonly string[]).map((dow) => (
            <div key={dow} className="volapp-cal-dow" role="columnheader">
              {dow}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell.date) {
              return <div key={`pad-${i}`} className="volapp-cal-cell volapp-cal-cell--pad" aria-hidden="true" />
            }
            const key = dayKey(cell.date)
            const isToday = key === todayKey
            const isAvail = availableDows.has(cell.date.getDay())
            const dls = deadlinesByDay.get(key) ?? []
            return (
              <div
                key={key}
                role="gridcell"
                className={`volapp-cal-cell${isToday ? ' volapp-cal-cell--today' : ''}${isAvail ? ' volapp-cal-cell--available' : ''}`}
              >
                <span className="volapp-cal-daynum">{cell.date.getDate()}</span>
                {dls.map((dl) => (
                  <span
                    key={dl.id}
                    className="volapp-cal-deadline"
                    title={dl.title || labelFor(dl.category)}
                  >
                    {dl.title || labelFor(dl.category)}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        <div className="volapp-cal-legend">
          <span className="volapp-cal-legend-item">
            <span className="volapp-cal-swatch volapp-cal-swatch--deadline" aria-hidden="true" />
            {c.legendDeadline}
          </span>
          <span className="volapp-cal-legend-item">
            <span className="volapp-cal-swatch volapp-cal-swatch--available" aria-hidden="true" />
            {c.legendAvailable}
          </span>
        </div>
      </section>

      {/* ── Deadlines list (text fallback / detail) ───────────── */}
      <section className="card volapp-panel">
        <h2 className="volapp-panel-title">{c.deadlinesTitle}</h2>
        {assigned.filter((a) => a.deadline).length > 0 ? (
          <dl className="volapp-meta">
            {assigned
              .filter((a) => a.deadline)
              .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
              .map((a) => (
                <div className="volapp-meta-row" key={a.id}>
                  <dt>
                    <CalendarClock size={13} aria-hidden="true" /> {a.title || labelFor(a.category)}
                  </dt>
                  <dd className="volapp-deadline-val">{formatDate(a.deadline as string, lang)}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <p className="volapp-muted">{c.noDeadlines}</p>
        )}
      </section>

      {/* ── Availability editor ───────────────────────────────── */}
      <AvailabilityEditor me={me} onSaved={(updated) => setMe(updated)} />
    </VolunteerLayout>
  )
}
