import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useApp } from '@/contexts/AppContext'
import { apiJson } from '@/lib/apiClient'
import type { VolunteerMe } from '@/types'

/**
 * Editable work-status control (Free / Working / Unavailable). The backend
 * (`PATCH /api/volunteer/me`) already accepts `workStatus` + `availableAgainOn`;
 * this is the missing UI. Choosing "Unavailable" reveals an optional return-date.
 * Shared by the volunteer dashboard and the calendar so status, hours and
 * deadlines live together.
 */
const STATUSES = ['free', 'working', 'unavailable'] as const
type WorkStatus = (typeof STATUSES)[number]

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
  const againOn = (me as { availableAgainOn?: string | null } | null)?.availableAgainOn ?? null

  const save = async (status: WorkStatus, date: string | null) => {
    if (busy) return
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
