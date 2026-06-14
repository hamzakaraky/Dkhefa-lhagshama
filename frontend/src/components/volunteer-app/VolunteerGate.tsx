import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { roleHome } from '@/utils/roleHome'

/**
 * Role gate for /volunteer-hub/* pages. While auth resolves, shows a light
 * loading state. If not signed in, redirects to /login?next=<path>. If signed
 * in but not a volunteer or admin, redirects to the user's role-home with a
 * toast. Mirrors AdminGate but allows `volunteer` OR `admin`.
 */
interface VolunteerGateProps {
  children: ReactNode
}

export default function VolunteerGate({ children }: VolunteerGateProps) {
  const { user, role, loading } = useAuth()
  const { t } = useLanguage()
  const { toast } = useApp()
  const router = useRouter()
  const v = t.volunteerApp

  useEffect(() => {
    if (loading || user) return
    // Grace window before redirecting on (loading=false, user=null): Firebase
    // can briefly emit a null user during a token refresh before re-emitting
    // the signed-in user; redirecting on that transient null bounced
    // authenticated volunteers to /login mid-flow. Cancelled the moment the
    // user reappears, so an established session never navigates away.
    const handle = setTimeout(() => {
      const next = encodeURIComponent(router.asPath || '/volunteer-hub')
      router.replace(`/login?next=${next}`)
    }, 600)
    return () => clearTimeout(handle)
  }, [loading, user, router])

  // Signed in but neither volunteer nor admin → redirect to their role-home
  // with an explanatory toast instead of dead-ending on the access-denied card.
  // Wait until role is resolved (non-null) before deciding.
  useEffect(() => {
    if (loading || !user || role === null) return
    if (role === 'volunteer' || role === 'admin') return
    toast(v.ui.roleMismatchToast, 'info')
    router.replace(roleHome(role))
  }, [loading, user, role, router, toast, v])

  if (loading || !user) {
    return (
      <div className="admin-gate-msg" role="status" aria-live="polite">
        <span className="skeleton skeleton-title" style={{ width: '14rem' }} aria-hidden="true" />
        <span className="sr-only">{v.ui.loading}</span>
      </div>
    )
  }

  const allowed = role === 'volunteer' || role === 'admin'
  if (!allowed) {
    // The effect above is redirecting to this user's role-home. Render the
    // neutral loading state until router.replace lands, so a non-volunteer
    // never sees a dead-end card.
    return (
      <div className="admin-gate-msg" role="status" aria-live="polite">
        <span className="skeleton skeleton-title" style={{ width: '14rem' }} aria-hidden="true" />
        <span className="sr-only">{v.ui.loading}</span>
      </div>
    )
  }

  return children
}
