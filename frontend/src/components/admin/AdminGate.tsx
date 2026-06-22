/**
 * AdminGate — client-side route guard wrapper for the /admin/* page group.
 * wrap an admin page's content in <AdminGate> and it only renders for an
 * authenticated admin; everyone else is redirected (signed-out -> login,
 * wrong-role -> their own home with a toast). thin shell over the shared
 * useRouteGuard hook + GateLoading fallback; the access decision is sync,
 * so non-admins never see a flash of admin content.
 */
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
  // status is one of 'loading' | 'allowed' | 'redirecting'; the hook fires the
  // redirect itself, here we only gate what renders.
  const status = useRouteGuard({
    allow: ['admin'],
    roleMismatchToast: t.admin.ui.roleMismatchToast,
  })
  // anything other than an explicit 'allowed' (loading or mid-redirect) shows
  // the loading fallback, so denied users never glimpse the wrapped page.
  if (status !== 'allowed') return <GateLoading label={t.admin.ui.loading} />
  return <>{children}</>
}
