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

let toastId = 0

export function AppProvider({ children }: { children: ReactNode }) {
  // ── TOAST ──────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])

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

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
