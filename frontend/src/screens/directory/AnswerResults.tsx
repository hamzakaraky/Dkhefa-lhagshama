/*
 * AnswerResults — presentational grid for the directory's answers catalog
 * (the 'ngo' / 'partner' tabs). Renders one card per organization on the
 * current page, or an empty state, plus the pagination control. Pure view:
 * all data, filtering, paging state and the open-modal callback come from the
 * parent Directory screen via props. `L` resolves bilingual fields to the
 * active language; `d` is the (loose TNode) translation table for static copy.
 */
import type { LucideIcon } from 'lucide-react'
import { HeartHandshake, Handshake } from 'lucide-react'
import Pagination from '@/components/data-display/Pagination'
import Reveal from '../../components/motion/Reveal'
import type { TNode } from '@/types'
import { PER_PAGE } from './constants'
import type { Bilingual, DirRecord } from './constants'

type Props = {
  d: TNode                                  // translation table for static copy (loose TNode view)
  activeTab: string                         // 'ngo' | 'partner' — only drives the empty-state icon/text
  answerPageData: DirRecord[]               // already-sliced records for the current page
  filteredAnswersLength: number             // total matches across pages (drives Pagination)
  answerPage: number
  setAnswerPage: (v: number) => void
  L: (v: Bilingual) => string               // resolve a bilingual field to the active language
  catLabel: (id: string) => string          // category id -> localized label
  openAnswerModal: (answer: DirRecord) => void
  ArrowIcon: LucideIcon                      // direction-aware CTA arrow (flips for RTL upstream)
}

// renders the current page of answer cards (or empty state) + pagination.
export default function AnswerResults({
  d,
  activeTab,
  answerPageData,
  filteredAnswersLength,
  answerPage,
  setAnswerPage,
  L,
  catLabel,
  openAnswerModal,
  ArrowIcon,
}: Props) {
  return (
    <>
      {answerPageData.length > 0 ? (
        <div className="dir-grid">
          {answerPageData.map((answer, i) => {
            const aTitle = L(answer.title)
            const aRegion = L(answer.region)
            const aAudience = L(answer.audience)
            // badge label: the catch-all 'all' category shows the generic filter copy, otherwise the localized category name
            const areaLabel = answer.category && (answer.category === 'all' ? d.filterAll : catLabel(String(answer.category)))
            return (
            // staggered reveal capped at 6 cards (Math.min(i,5)) so later rows don't lag
            <Reveal key={answer.id} delay={Math.min(i, 5) * 0.06} className="card card-interactive dir-answer-card">
              {areaLabel && (
                <span className="dir-answer-badge">
                  {areaLabel}
                </span>
              )}
              <h3 className="dir-answer-title">
                {aTitle || d.untitledOrg}
              </h3>
              {(aRegion || aAudience) && (
                <div className="dir-answer-sub">
                  {aRegion}{aRegion && aAudience ? ' • ' : ''}{aAudience}
                </div>
              )}
              <p className="dir-answer-body">
                {L(answer.body)}
              </p>
              <div className="dir-tags">
                {aRegion && (
                  <span className="dir-tag">{aRegion}</span>
                )}
                {aAudience && (
                  <span className="dir-tag">{aAudience}</span>
                )}
              </div>
              <div className="dir-answer-footer">
                <button className="btn btn-navy btn-sm dir-answer-cta" onClick={() => openAnswerModal(answer)}>
                  {d.moreBtn}
                  <ArrowIcon size={14} aria-hidden="true" />
                </button>
              </div>
            </Reveal>
            )
          })}
        </div>
      ) : (
        // empty state: partner tab gets a different icon/heading than the ngo tab
        <div className="dir-state">
          <span className="dir-state-icon">
            {activeTab === 'partner'
              ? <Handshake size={26} aria-hidden="true" />
              : <HeartHandshake size={26} aria-hidden="true" />}
          </span>
          <h3 className="section-display dir-state-title">
            {activeTab === 'partner' ? d.emptyPartners : d.emptyAnswers}
          </h3>
          <p className="dir-state-hint">{d.noResultsHint}</p>
        </div>
      )}
      <Pagination total={filteredAnswersLength} perPage={PER_PAGE} current={answerPage} onChange={setAnswerPage} />
    </>
  )
}
