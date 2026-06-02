import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { mockRequests, mockUsers, mockVolunteers, mockBusinesses } from '../data/mockData'
import type { Request, AdminUser, Volunteer, Business } from '@/types'

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
  requests: Request[]
  addRequest: (req: Partial<Request>) => string
  updateRequest: (id: string, updates: Partial<Request>) => void
  deleteRequest: (id: string) => void
  users: AdminUser[]
  deleteUser: (id: AdminUser['id']) => void
  volunteers: Volunteer[]
  addVolunteer: (vol: Partial<Volunteer>) => Volunteer['id']
  businesses: Business[]
  addBusiness: (biz: Partial<Business>) => void
  approveBusiness: (id: Business['id']) => void
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

  // ── REQUESTS ───────────────────────────────────────────
  const [requests, setRequests] = useState<Request[]>(mockRequests as Request[])

  const addRequest = useCallback((req: Partial<Request>) => {
    const newReq = {
      ...req,
      id: `PFF-${new Date().getFullYear()}-${String(requests.length + 248).padStart(4, '0')}`,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      handler: null,
      notes: '',
    } as Request
    setRequests(prev => [newReq, ...prev])
    return newReq.id
  }, [requests.length])

  const updateRequest = useCallback((id: string, updates: Partial<Request>) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [])

  const deleteRequest = useCallback((id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
  }, [])

  // ── USERS ──────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>(mockUsers as AdminUser[])

  const deleteUser = useCallback((id: AdminUser['id']) => {
    setUsers(prev => prev.filter(u => u.id !== id))
  }, [])

  // ── VOLUNTEERS ─────────────────────────────────────────
  const [volunteers, setVolunteers] = useState<Volunteer[]>(mockVolunteers as Volunteer[])

  const addVolunteer = useCallback((vol: Partial<Volunteer>) => {
    const newVol = {
      ...vol,
      id: volunteers.length + 1,
      status: 'available',
      joinedDate: new Date().toISOString().slice(0, 7),
      assignedTo: null,
    } as Volunteer
    setVolunteers(prev => [...prev, newVol])
    return newVol.id
  }, [volunteers.length])

  // ── BUSINESSES ─────────────────────────────────────────
  const [businesses, setBusinesses] = useState<Business[]>(mockBusinesses as Business[])

  const addBusiness = useCallback((biz: Partial<Business>) => {
    const newBiz = { ...biz, id: businesses.length + 1, approved: false, rating: 0, reviews: 0 } as Business
    setBusinesses(prev => [...prev, newBiz])
  }, [businesses.length])

  const approveBusiness = useCallback((id: Business['id']) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, approved: true } : b))
  }, [])

  // ── MODAL ──────────────────────────────────────────────
  const [modal, setModal] = useState<ReactNode>(null)
  const openModal = useCallback((content: ReactNode) => setModal(content), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider value={{
      toasts, toast, removeToast,
      requests, addRequest, updateRequest, deleteRequest,
      users, deleteUser,
      volunteers, addVolunteer,
      businesses, addBusiness, approveBusiness,
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