import type { ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouteGuard } from '@/hooks/useRouteGuard'
import GateLoading from '@/components/gates/GateLoading'

/**
 * Route guard for /admin/* pages: admin only. Signed-out users go to
 * /login?next=<path>; signed-in non-admins are bounced to their own role-home
 * with a toast (never a dead-end access-denied card). The access decision is
 * synchronous (see {@link useRouteGuard}); only the redirect is an effect.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const status = useRouteGuard({
    allow: ['admin'],
    roleMismatchToast: t.admin.ui.roleMismatchToast,
  })
  if (status !== 'allowed') return <GateLoading label={t.admin.ui.loading} />
  return <>{children}</>
}
