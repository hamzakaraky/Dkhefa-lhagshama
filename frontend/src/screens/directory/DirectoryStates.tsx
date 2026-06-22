// Presentational status banner for the public directory grid (UC-02 answers /
// UC-03 businesses). Renders exactly one of three async UI states above the
// results: a polite live results-count, an error card with Retry, or a
// skeleton-card loading grid. Stateless and side-effect free — the owning
// directory page drives the fetch and passes down loading/error/count + retry.
// States are mutually exclusive by the !loading/!error guards below; the
// skeleton mirrors PER_PAGE (page size) so the layout doesn't shift on load.

import { AlertTriangle } from 'lucide-react'
import type { TNode } from '@/types'
import { PER_PAGE } from './constants'
import styles from './DirectoryStates.module.css'

// d = directory-specific copy (loadError/retry), t = shared bilingual table
// (common.loading/results). error is the fetch error message or null; retry
// re-triggers the parent's fetch.
type Props = {
  d: TNode
  t: TNode
  loading: boolean
  error: string | null
  resultsCount: number
  retry: () => void
}

export default function DirectoryStates({ d, t, loading, error, resultsCount, retry }: Props) {
  return (
    <>
      {/* ── RESULTS COUNT ─────────────────────────────────────────── */}
      {!error && (
        <div aria-live="polite" className="dir-results-count">
          {loading ? t.common.loading : `${resultsCount} ${t.common.results}`}
        </div>
      )}

      {/* ── ERROR STATE (with Retry) ──────────────────────────────── */}
      {!loading && error && (
        <div className="dir-state" role="alert">
          <span className="dir-state-icon is-error">
            <AlertTriangle size={26} aria-hidden="true" />
          </span>
          <h3 className="section-display dir-state-title">{d.loadError}</h3>
          <button className={`btn btn-ember ${styles.retryBtn}`} onClick={() => retry()}>
            {d.retry}
          </button>
        </div>
      )}

      {/* ── LOADING SKELETON — branded card bones ─────────────────── */}
      {loading && !error && (
        <div className="dir-grid" aria-hidden="true">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <div key={i} className="card-bones">
              <div className="card-bones-head">
                <span className="skeleton card-bones-avatar" />
                <span className="card-bones-head-lines">
                  <span className="skeleton bone bone-title" />
                  <span className="skeleton bone bone-sub" />
                </span>
              </div>
              <span className="skeleton bone bone-line" />
              <span className="skeleton bone bone-line bone-w-90" />
              <span className="skeleton bone bone-line bone-w-75" />
              <span className="skeleton bone bone-pill" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
