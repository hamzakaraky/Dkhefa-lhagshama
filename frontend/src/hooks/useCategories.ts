/**
 * useCategories — client hook over the public GET /api/categories taxonomy
 * (feedback round 2: admin-managed categories).
 *
 * Categories are Firestore docs keyed by slug id with bilingual labels
 * { nameHe, nameEn }. Labels come from the doc, NEVER from translations.ts;
 * the static t-maps survive only as fallbacks for legacy keys on old request
 * docs, and every lookup ultimately falls back to the raw id so historical
 * data always renders something (archived categories are filtered out of the
 * public endpoint, so they resolve through this fallback chain too).
 *
 * The fetch is memoized at module level (simple promise memo), so any number
 * of mounted consumers share ONE network call per page load. Admin category
 * mutations call refresh()/refreshCategories() to drop the cache so pickers
 * see changes immediately. SSR-safe: the fetch only runs inside useEffect.
 */
import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiJson } from '@/lib/apiClient'
import type { Category, Lang } from '@/types'

let cache: Category[] | null = null
let inflight: Promise<Category[]> | null = null

function load(): Promise<Category[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = apiJson<{ items?: Category[] }>('/api/categories')
      .then((data) => {
        cache = Array.isArray(data.items) ? data.items : []
        return cache
      })
      .catch(() => {
        // Fail soft: pickers render empty and label lookups fall through to
        // the legacy t-maps / raw id. The failure is NOT cached, so the next
        // mounting consumer retries.
        return []
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Drop the module cache and refetch (admin category mutations call this). */
export function refreshCategories(): Promise<Category[]> {
  cache = null
  return load()
}

export interface UseCategoriesResult {
  /** Active (non-archived) categories, Hebrew-label sorted by the API. */
  categories: Category[]
  loading: boolean
  /**
   * Resolve a category id to its display label:
   * doc nameHe/nameEn per language → legacy t-map fallback → the raw id.
   */
  labelFor: (id: string | null | undefined, lang?: Lang) => string
  /** Force a refetch (shared module cache) and update this consumer. */
  refresh: () => Promise<void>
}

export function useCategories(): UseCategoriesResult {
  const { t, lang: activeLang } = useLanguage()
  const [categories, setCategories] = useState<Category[]>(() => cache ?? [])
  const [loading, setLoading] = useState(cache === null)

  useEffect(() => {
    let alive = true
    load().then((items) => {
      if (!alive) return
      setCategories(items)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const labelFor = useCallback(
    (id: string | null | undefined, lang?: Lang): string => {
      if (!id) return ''
      const l = lang ?? activeLang
      const doc = categories.find((c) => c.id === id)
      if (doc) return (l === 'he' ? doc.nameHe : doc.nameEn) || id
      // Legacy fallbacks keep labels for archived/removed keys on old docs.
      const legacy =
        (t.myRequests.categories as Record<string, string>)[id] ??
        (t.directory.ngoAreas as Record<string, string>)[id]
      return legacy ?? id
    },
    [categories, t, activeLang],
  )

  const refresh = useCallback(async () => {
    const items = await refreshCategories()
    setCategories(items)
    setLoading(false)
  }, [])

  return { categories, loading, labelFor, refresh }
}
