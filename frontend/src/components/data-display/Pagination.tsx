/**
 * Pagination — presentational page-navigation control for list/table views.
 *
 * Stateless: the parent owns `current` and the page data; this only renders
 * prev/next + numbered buttons and reports clicks via `onChange`. Used across
 * admin lists (requests, volunteers, directory) and other paged data displays.
 * Bilingual/RTL-aware via useLanguage: chevron direction flips for HE and the
 * "page X of N" label is pulled from shared translations. Renders nothing when
 * there is at most one page.
 */
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import styles from './Pagination.module.css'

interface PaginationProps {
  total: number      // total item count (not page count)
  perPage?: number   // items per page; page count is derived from total/perPage
  current: number    // 1-based active page, controlled by the parent
  onChange: (page: number) => void
}

export default function Pagination({ total, perPage = 10, current, onChange }: PaginationProps) {
  const { t, isRTL } = useLanguage()
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null // nothing to paginate

  // in RTL "previous" points right and "next" points left, so swap the chevrons
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft
  const NextIcon = isRTL ? ChevronLeft : ChevronRight

  // build the visible page list: all pages when small, otherwise first + a
  // window around current + last, with '...' gaps in between (windowed pager)
  const getPages = (): Array<number | '...'> => {
    const arr: Array<number | '...'> = []
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) arr.push(i)
    } else {
      arr.push(1)
      if (current > 3) arr.push('...')
      for (let i = Math.max(2, current - 1); i <= Math.min(pages - 1, current + 1); i++) arr.push(i)
      if (current < pages - 2) arr.push('...')
      arr.push(pages)
    }
    return arr
  }

  return (
    <div className={styles.root}>
      <button className="page-btn" onClick={() => onChange(current - 1)} disabled={current === 1}>
        <PrevIcon size={14} />
      </button>
      {getPages().map((p, i) => (
        p === '...'
          ? <span key={i} className={styles.ellipsis}>…</span>
          : <button key={i} className={`page-btn${p === current ? ' active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className="page-btn" onClick={() => onChange(current + 1)} disabled={current === pages}>
        <NextIcon size={14} />
      </button>
      <span className={styles.count}>
        {t.common.page} {current} {t.common.of} {pages}
      </span>
    </div>
  )
}