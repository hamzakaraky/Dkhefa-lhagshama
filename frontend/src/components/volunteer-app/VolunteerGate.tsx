import type { ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouteGuard } from '@/hooks/useRouteGuard'
import GateLoading from '@/components/gates/GateLoading'

/**
 * Route guard for /volunteer-hub/* pages: volunteer (or admin, via the hasRole
 * superset). Signed-out users go to /login?next=<path>; signed-in users who are
 * neither volunteer nor admin are bounced to their own role-home with a toast.
 * The access decision is synchronous (see {@link useRouteGuard}).
 */
export default function VolunteerGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const v = t.volunteerApp
  const status = useRouteGuard({
    allow: ['volunteer'],
    roleMismatchToast: v.ui.roleMismatchToast,
  })
  if (status !== 'allowed') return <GateLoading label={v.ui.loading} />
  return <>{children}</>
}
