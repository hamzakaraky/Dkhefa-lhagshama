import { Clock3, History } from 'lucide-react'
import type { Translations } from '@/contexts/LanguageContext'
import type { ActiveVolunteer, RequestDetail } from './types'
import { eventLabel } from './helpers'
import styles from './RequestTimeline.module.css'

interface RequestTimelineProps {
  request: RequestDetail
  a: Translations['admin']
  volunteers: ActiveVolunteer[]
  fmt: (ts: string | number | Date | undefined) => string
}

// The request audit/timeline rail. Pure presentation lifted from the screen's
// main <section>.
export default function RequestTimeline({ request, a, volunteers, fmt }: RequestTimelineProps) {
  return (
    <div className={styles.root}>
      <span className={`${styles.eyebrow} ${styles.eyebrowInk}`}>
        <History size={14} aria-hidden="true" />
        {a.reqDetail.timeline}
      </span>

      {request.events && request.events.length > 0 ? (
        <ul className={styles.list}>
          {request.events.map((ev, i, arr) => (
            <li
              key={ev.id}
              className={styles.item}
              style={{ paddingBlockEnd: i < arr.length - 1 ? 'var(--sp-4)' : 0 }}
            >
              {/*
                Marker + connector rail. The dot must sit on the FIRST
                line of the event label even when the note wraps to
                several lines and even at the larger HE serif metrics.
                Rather than hardcoding pixel offsets tied to one font's
                cap height, we give this column a line box that matches
                the label's line-height (1.45em) and center the dot in
                it. The rail then starts right below the dot and runs to
                the next item, derived from the same line-height — no
                magic numbers, and it re-balances if the label wraps.
              */}
              <span aria-hidden="true" className={styles.marker}>
                <span
                  className={styles.dot}
                  style={{
                    background: i === 0 ? 'var(--ember)' : 'var(--white)',
                    border: `2px solid ${i === 0 ? 'var(--ember)' : 'var(--gray-300)'}`,
                    boxShadow: i === 0 ? 'var(--ring)' : 'none',
                  }}
                />
                {i < arr.length - 1 && <span className={styles.connector} />}
              </span>

              <div className={styles.eventBody}>
                <span className={styles.eventLabel}>
                  {eventLabel(ev, a, volunteers)}
                </span>
                <time className={styles.eventTime}>
                  {fmt(ev.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div role="status" className={styles.empty}>
          <Clock3 size={18} aria-hidden="true" />
          <span>{a.reqDetail.noEvents}</span>
        </div>
      )}
    </div>
  )
}
