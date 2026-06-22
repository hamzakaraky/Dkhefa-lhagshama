import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useApp } from '@/contexts/AppContext'
import { apiJson } from '@/lib/apiClient'
import type { VolunteerMe } from '@/types'

/**
 * WorkStatusControl: the volunteer's self-service availability toggle
 * (Free / Working / Unavailable). Rendered in the volunteer dashboard and the
 * calendar so status, hours and deadlines sit together. Each click PATCHes
 * `/api/volunteer/me` and hands the fresh VolunteerMe back to the parent via
 * `onChange` (the parent owns the state; this component is controlled by `me`).
 * Invariant: `availableAgainOn` is only meaningful while status is "unavailable"
 * and is cleared to null on any other status.
 */
const STATUSES = ['free', 'working', 'unavailable'] as const
type WorkStatus = (typeof STATUSES)[number]

// props: `me` is the source of truth (status + return-date read from it);
// `onChange` lifts the server's updated record back to the owning page.
export default function WorkStatusControl({
  me,
  onChange,
}: {
  me: VolunteerMe | null
  onChange: (m: VolunteerMe) => void
}) {
  const { t } = useLanguage()
  const a = t.volunteerApp.dash.availability
  const { toast } = useApp()
  const [busy, setBusy] = useState(false)
  const current = (me?.workStatus ?? 'free') as WorkStatus
  // availableAgainOn is not on the VolunteerMe type yet, so read it via a local cast.
  const againOn = (me as { availableAgainOn?: string | null } | null)?.availableAgainOn ?? null

  // persist a status change; clears availableAgainOn unless the new status is "unavailable".
  const save = async (status: WorkStatus, date: string | null) => {
    if (busy) return // guard against concurrent PATCHes while one is in flight
    setBusy(true)
    try {
      const updated = await apiJson<VolunteerMe>('/api/volunteer/me', {
        method: 'PATCH',
        body: JSON.stringify({
          workStatus: status,
          availableAgainOn: status === 'unavailable' ? date : null,
        }),
      })
      onChange(updated)
    } catch {
      toast(a.statusError, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="work-status">
      <div className="work-status-seg" role="group" aria-label={a.setStatus}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`work-status-opt${current === s ? ' is-active' : ''}`}
            aria-pressed={current === s}
            disabled={busy}
            onClick={() => save(s, s === 'unavailable' ? againOn : null)}
          >
            <span className={`voldash-avail-dot is-${s}`} aria-hidden="true" />
            {a[s]}
          </button>
        ))}
      </div>
      {current === 'unavailable' && (
        <label className="work-status-date">
          <span>{a.availableAgainOn}</span>
          <input
            type="date"
            className="form-input"
            value={againOn ?? ''}
            onChange={(e) => save('unavailable', e.target.value || null)}
          />
        </label>
      )}
    </div>
  )
}
