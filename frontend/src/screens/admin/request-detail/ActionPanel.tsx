/*
 * ActionPanel — the sticky right-rail <aside> on the admin request-detail screen.
 * Pure presentation: it renders four stacked sections (volunteer matching/assignment
 * via the nested MatchPanel, the legal lifecycle transitions for the current status,
 * the attachment list, and the free-text note field) but owns no state or data
 * fetching. Every value and callback is driven by the parent screen via props, so
 * this component is a dumb, fully-controlled view. Bilingual: all copy comes from
 * the LanguageContext slices (a/lc/m/t) and layout flips with isRTL.
 */
import type { LucideIcon } from 'lucide-react'
import {
  StickyNote,
  Share2,
  Archive,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import type { Translations } from '@/contexts/LanguageContext'
import type {
  Candidate,
  MatchReason,
  MatchingI18n,
  PendingTransition,
  RequestDetail,
  TransitionKind,
} from './types'
import MatchPanel from './MatchPanel'
import styles from './ActionPanel.module.css'

// all props are supplied by the parent request-detail screen; grouped by the
// section they feed (matching, lifecycle, documents, note). nothing is local.
interface ActionPanelProps {
  request: RequestDetail
  a: Translations['admin']
  lc: Translations['lifecycle']
  t: Translations
  isRTL: boolean
  m: MatchingI18n
  EMPTY: string
  saving: boolean
  assignedLabel: React.ReactNode
  isTerminal: boolean
  // Matching / assignment.
  reassigning: boolean
  setReassigning: (v: boolean) => void
  candidatesError: boolean
  candidates: Candidate[]
  candidateSearch: string
  setCandidateSearch: (v: string) => void
  filteredCandidates: Candidate[]
  visibleCandidates: Candidate[]
  safeIdx: number
  setCandIdx: React.Dispatch<React.SetStateAction<number>>
  assigningUid: string | null
  assignedCandidate: Candidate | null
  reasonChipLabel: (r: MatchReason) => string
  handleAssignCandidate: (uid: string) => void
  // Lifecycle transitions.
  transitionControls: {
    key: TransitionKind
    label: string
    Icon: LucideIcon
    pt: PendingTransition
    danger?: boolean
  }[]
  canRefer: boolean
  canArchive: boolean
  setPendingTransition: (pt: PendingTransition) => void
  openReferDialog: () => void
  // Documents.
  openingDoc: string | null
  viewDoc: (name: string) => void
  // Note.
  note: string
  setNote: (v: string) => void
  handleNote: () => void
}

// renders the four sections top-to-bottom: matching/assignment (MatchPanel),
// lifecycle transitions, documents, note. fully controlled by props.
export default function ActionPanel({
  request,
  a,
  lc,
  t,
  isRTL,
  m,
  EMPTY,
  saving,
  assignedLabel,
  isTerminal,
  reassigning,
  setReassigning,
  candidatesError,
  candidates,
  candidateSearch,
  setCandidateSearch,
  filteredCandidates,
  visibleCandidates,
  safeIdx,
  setCandIdx,
  assigningUid,
  assignedCandidate,
  reasonChipLabel,
  handleAssignCandidate,
  transitionControls,
  canRefer,
  canArchive,
  setPendingTransition,
  openReferDialog,
  openingDoc,
  viewDoc,
  note,
  setNote,
  handleNote,
}: ActionPanelProps) {
  return (
    <aside className={`card admin-detail-side ${styles.panel}`}>
      <span className={`${styles.eyebrow} ${styles.eyebrowSpaced}`}>
        {a.reqDetail.changeStatus}
      </span>

      <div className={`field ${styles.fieldTopGap}`}>
        <span className={`form-label ${styles.iconLabel}`}>
          <Sparkles size={15} aria-hidden="true" className={styles.accentIcon} />
          {m.heading}
        </span>
        <p className={styles.subtitle}>
          {m.subtitle}
        </p>

        <MatchPanel
          request={request}
          a={a}
          t={t}
          isRTL={isRTL}
          m={m}
          saving={saving}
          assignedLabel={assignedLabel}
          isTerminal={isTerminal}
          reassigning={reassigning}
          setReassigning={setReassigning}
          candidatesError={candidatesError}
          candidates={candidates}
          candidateSearch={candidateSearch}
          setCandidateSearch={setCandidateSearch}
          filteredCandidates={filteredCandidates}
          visibleCandidates={visibleCandidates}
          safeIdx={safeIdx}
          setCandIdx={setCandIdx}
          assigningUid={assigningUid}
          assignedCandidate={assignedCandidate}
          reasonChipLabel={reasonChipLabel}
          handleAssignCandidate={handleAssignCandidate}
        />
      </div>

      {/* ── Lifecycle transitions (Note 6 + 8) — only legal moves from
          the current status are shown. Refer + archive sit alongside. ── */}
      <div className={`field ${styles.fieldSection}`}>
        <span className={`form-label ${styles.iconLabelSpaced}`}>
          <Share2 size={15} aria-hidden="true" className={styles.accentIcon} />
          {a.reqDetail.changeStatus}
        </span>

        {transitionControls.length === 0 && !canRefer && !canArchive ? (
          <p className={styles.muted}>
            {EMPTY}
          </p>
        ) : (
          <div className="admin-lifecycle-actions" role="group" aria-label={a.reqDetail.changeStatus}>
            {transitionControls.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`btn admin-side-btn ${c.danger ? 'btn-danger' : 'btn-outline'}`}
                disabled={saving}
                onClick={() => setPendingTransition(c.pt)}
              >
                <c.Icon size={15} aria-hidden="true" />
                {c.label}
              </button>
            ))}
            {canRefer && (
              <button
                type="button"
                className="btn btn-outline admin-side-btn"
                disabled={saving}
                onClick={openReferDialog}
              >
                <Share2 size={15} aria-hidden="true" />
                {lc.actions.refer}
              </button>
            )}
            {canArchive && (
              <button
                type="button"
                className="btn btn-outline admin-side-btn"
                disabled={saving}
                onClick={() => setPendingTransition({ kind: 'archive' })}
              >
                <Archive size={15} aria-hidden="true" />
                {lc.actions.archive}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Documents (Note 1) — list attachments; viewDoc (parent) mints a
          fresh short-lived signed URL on click. busy-per-row via openingDoc. ── */}
      <div className={`field ${styles.fieldSection}`}>
        <span className={`form-label ${styles.iconLabelSpaced}`}>
          <FileText size={15} aria-hidden="true" className={styles.accentIcon} />
          {lc.docs.heading}
        </span>

        {request.attachments && request.attachments.length > 0 ? (
          <ul className="admin-doc-list">
            {request.attachments.map((doc) => {
              const busy = openingDoc === doc.name
              return (
                <li key={doc.name} className="admin-doc-item">
                  <FileText size={16} aria-hidden="true" className="admin-doc-icon" />
                  <span className="admin-doc-name" title={doc.name}>{doc.name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm admin-doc-view"
                    disabled={busy}
                    aria-busy={busy || undefined}
                    aria-label={`${lc.docs.view}: ${doc.name}`}
                    onClick={() => viewDoc(doc.name)}
                  >
                    {busy ? lc.docs.opening : lc.docs.view}
                    {!busy && <ExternalLink size={14} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.muted}>
            {lc.docs.empty}
          </p>
        )}
      </div>

      <div className={`field ${styles.fieldSection}`}>
        <label className={`form-label ${styles.iconLabel}`} htmlFor="note">
          <StickyNote size={15} aria-hidden="true" className={styles.accentIcon} />
          {a.reqDetail.addNote}
        </label>
        <textarea
          id="note"
          className="form-textarea"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={a.reqDetail.notePH}
        />
        {/* guard blocks saving an empty/whitespace-only note */}
        <button
          type="button"
          className="btn btn-outline admin-side-btn"
          disabled={saving || !note.trim()}
          onClick={handleNote}
        >
          {a.reqDetail.saveNote}
        </button>
      </div>
    </aside>
  )
}
