import { Share2 } from 'lucide-react'
import type { Translations } from '@/contexts/LanguageContext'
import type { AnswerOption } from './types'
import styles from './ReferDialog.module.css'

interface ReferDialogProps {
  a: Translations['admin']
  lc: Translations['lifecycle']
  t: Translations
  referring: boolean
  setReferOpen: (v: boolean) => void
  answersLoaded: boolean
  answers: AnswerOption[]
  referAnswerId: string
  setReferAnswerId: (v: string) => void
  referNote: string
  setReferNote: (v: string) => void
  resolveBilingual: (v: AnswerOption['title']) => string
  submitReferral: () => void
}

// modal dialog (presentational only) used in the admin request-detail screen to
// refer a request out to a partner org from the answers catalog. lets staff pick
// a partner + write an optional note, then fires submitReferral. all state lives
// in the parent (request-detail container); this component just renders + reports
// events back via the setter/submit callbacks. uses the shared branded
// confirm-overlay/confirm-box surface so it matches the other admin confirm dialogs.
//
// props: a/lc/t are i18n string maps (admin, lifecycle, root translations);
// referring = in-flight flag that disables the surface + drives the loading state;
// answersLoaded gates the partner <select> between loading/empty/ready;
// answers + referAnswerId/setReferAnswerId is the controlled partner picker;
// referNote/setReferNote is the controlled note textarea;
// resolveBilingual collapses a {he,en} title to the active language;
// submitReferral commits the referral. invariant: submit stays disabled until a
// partner is chosen (referAnswerId truthy) and never fires while referring.
export default function ReferDialog({
  a,
  lc,
  t,
  referring,
  setReferOpen,
  answersLoaded,
  answers,
  referAnswerId,
  setReferAnswerId,
  referNote,
  setReferNote,
  resolveBilingual,
  submitReferral,
}: ReferDialogProps) {
  return (
    <div
      className="confirm-overlay"
      onMouseDown={(e) => {
        // backdrop click closes, but only a press that started on the overlay
        // itself (not bubbling up from the box) and never mid-submit
        if (e.target === e.currentTarget && !referring) setReferOpen(false)
      }}
    >
      <div
        className="confirm-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refer-title"
      >
        <span className="confirm-icon confirm-icon--default" aria-hidden="true">
          <Share2 size={22} />
        </span>
        <h2 id="refer-title" className="confirm-title">{lc.referral.dialogTitle}</h2>

        <div className={`field ${styles.field}`}>
          <label className="form-label" htmlFor="refer-partner">
            {lc.referral.choosePartner}
          </label>
          {/* three-way: loading -> empty catalog -> partner picker */}
          {!answersLoaded ? (
            <p className={styles.hint}>
              {a.ui.loading}
            </p>
          ) : answers.length === 0 ? (
            <p className={styles.hint}>
              {lc.referral.noPartners}
            </p>
          ) : (
            <select
              id="refer-partner"
              className="form-select"
              value={referAnswerId}
              onChange={(e) => setReferAnswerId(e.target.value)}
            >
              <option value="">{lc.referral.partnerPH}</option>
              {answers.map((ans) => (
                <option key={ans.id} value={ans.id}>
                  {/* prefer localized title, fall back to source name, then raw id */}
                  {resolveBilingual(ans.title) || resolveBilingual(ans.sourceName) || ans.id}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={`field ${styles.fieldSpaced}`}>
          <label className="form-label" htmlFor="refer-note">
            {lc.referral.noteLabel}
          </label>
          <textarea
            id="refer-note"
            className="form-textarea"
            rows={3}
            value={referNote}
            onChange={(e) => setReferNote(e.target.value)}
            placeholder={lc.referral.notePH}
          />
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setReferOpen(false)}
            disabled={referring}
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            className={`btn btn-primary${referring ? ' is-loading' : ''}`}
            onClick={submitReferral}
            disabled={referring || !referAnswerId}
            aria-busy={referring || undefined}
          >
            {referring ? lc.referral.submitting : lc.referral.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
