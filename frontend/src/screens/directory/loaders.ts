/*
 * Directory data loaders for the public directory screen (UC-02/UC-03).
 * Factory functions that bind a fetch routine to the page's setState callbacks,
 * so the screen can wrap each in useCallback and re-run it from a Retry button.
 * Two sources: businesses (GET /api/businesses) and answers (GET /api/answers,
 * scoped by orgType). Each loader takes a `live` flag so a stale in-flight
 * request from an unmounted effect is dropped instead of clobbering fresh state.
 */
import { apiJson } from '../../lib/apiClient'
import type { CaughtError } from '@/types'
import type { DirRecord } from './constants'

// cancellation token: effects flip `current` to false on cleanup so a late
// response is ignored; defaults to live so a manual Retry call always applies.
type Live = { current: boolean }

type BizDeps = {
  setBizLoading: (v: boolean) => void
  setBizError: (v: string | null) => void
  setBusinesses: (v: DirRecord[]) => void
}

// Loaders are built here so the page can wrap them in useCallback (the Retry
// buttons re-run them). `live` lets the effect cancel a stale in-flight request
// without blocking a manual retry.
export function makeLoadBusinesses({ setBizLoading, setBizError, setBusinesses }: BizDeps) {
  return async (live: Live = { current: true }) => {
    setBizLoading(true)
    setBizError(null)
    try {
      const data = await apiJson('/api/businesses') as { items?: DirRecord[] }
      if (live.current && data?.items) {
        setBusinesses(data.items)
      }
    } catch (err) {
      if (live.current) {
        setBizError((err as CaughtError)?.detail?.error || 'Unable to load businesses')
      }
    } finally {
      if (live.current) setBizLoading(false)
    }
  }
}

type AnswerDeps = {
  answerOrgType: string
  setAnswersLoading: (v: boolean) => void
  setAnswersError: (v: string | null) => void
  setAnswers: (v: DirRecord[]) => void
}

// builds the answers loader; `answerOrgType` (ngo vs partner) scopes the fetch
// to the active tab, the rest is filtered client-side (see note inside).
export function makeLoadAnswers({ answerOrgType, setAnswersLoading, setAnswersError, setAnswers }: AnswerDeps) {
  return async (live: Live = { current: true }) => {
    setAnswersLoading(true)
    setAnswersError(null)
    try {
      // Fetch the FULL orgType catalog once (no server-side `category` filter):
      // `orgType` scopes the answers to the active tab (ngo vs partner), and
      // category/region/audience are all filtered client-side. Keeping the
      // fetch category-agnostic means the loaded `answers` set always holds
      // every category for the tab, so the NGO_AREAS chip row stays complete
      // and a user can jump directly between categories (the chip set is
      // derived from this unfiltered set, not from a narrowed result).
      const query = new URLSearchParams()
      query.set('orgType', answerOrgType)
      const path = `/api/answers?${query.toString()}`
      const data = await apiJson(path) as { items?: DirRecord[] }
      if (live.current && data?.items) {
        setAnswers(data.items)
      }
    } catch (err) {
      if (live.current) {
        setAnswersError((err as CaughtError)?.detail?.error || 'Unable to load answers')
      }
    } finally {
      if (live.current) setAnswersLoading(false)
    }
  }
}
