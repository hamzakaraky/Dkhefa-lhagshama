/**
 * AppContext — app-wide UI scratch state, not domain/auth state.
 *
 * Holds three small concerns that any page may need: transient toasts,
 * a single global modal slot, and the public read-only volunteer roster
 * fixture. Provided once by AppProvider (mounted near the app root) and
 * consumed via the useApp() hook. Domain data (auth, requests, chats) lives
 * elsewhere; this context is intentionally lightweight and side-effect-free
 * apart from toast auto-dismiss timers.
 */
import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { mockVolunteers } from '../data/mockData'
import type { Volunteer } from '@/types'

/** A transient toast notification. */
export interface Toast {
  id: number
  message: string
  type: ToastType
}

export type ToastType = 'info' | 'success' | 'error' | 'warning' | string

/** The value exposed by {@link AppContext} via {@link useApp}. */
export interface AppContextValue {
  toasts: Toast[]
  toast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: number) => void
  // Public volunteer roster (read-only fixture consumed by VolunteerPage).
  volunteers: Volunteer[]
  modal: ReactNode
  openModal: (content: ReactNode) => void
  closeModal: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

// monotonic counter for unique toast ids; module-scoped so it survives re-renders.
let toastId = 0

// AppProvider — supplies toast/modal/volunteers state to the subtree via AppContext.
export function AppProvider({ children }: { children: ReactNode }) {
  // ── TOAST ──────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])

  // push a toast and schedule its own removal after `duration` ms (id matched, not index).
  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── VOLUNTEERS — public roster fixture (VolunteerPage) ──
  const [volunteers] = useState<Volunteer[]>(mockVolunteers as Volunteer[])

  // ── MODAL ──────────────────────────────────────────────
  const [modal, setModal] = useState<ReactNode>(null)
  const openModal = useCallback((content: ReactNode) => setModal(content), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider value={{
      toasts, toast, removeToast,
      volunteers,
      modal, openModal, closeModal,
    }}>
      {children}
    </AppContext.Provider>
  )
}

// useApp — typed accessor for AppContext; throws if called outside AppProvider.
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
