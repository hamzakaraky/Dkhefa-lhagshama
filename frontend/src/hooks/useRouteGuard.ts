/**
 * useRouteGuard — the app's single client-side page-access gate.
 *
 * Every protected page (admin/*, volunteer-hub/*, requests, chats, ...) calls this
 * hook with the roles it permits and renders content only when it returns 'allowed'.
 * It reads auth + role from AuthContext, role-home destinations from roleHome, and
 * uses AppContext's toast for the wrong-role case. Invariant: the access decision is
 * pure and synchronous (role never changes mid-mount, so no reactive effect); the
 * lone effect does nothing but the navigation that gating implies.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { roleHome } from '@/utils/roleHome'
import type { Role } from '@/types'

// guard outcome a page acts on: render content, show loading, or hold while redirecting.
export type GuardStatus = 'loading' | 'redirecting' | 'allowed'

interface RouteGuardOptions {
  /** Roles permitted to view the page. Admin always passes (superset via hasRole). */
  allow: Role[]
  /** Where to send signed-out users. Defaults to /login?next=<current path>. */
  signedOutRedirect?: string
  /** Toast shown when a signed-in user lacks an allowed role (before role-home redirect). */
  roleMismatchToast?: string
}

/**
 * Decides whether the current user may view a page, and redirects if not.
 *
 * The decision is computed synchronously at render from the (stable) auth + role
 * state; only the navigation runs in an effect. The transient-null grace that
 * prevents auth flicker lives once in AuthContext (sessionState), so this hook
 * needs no redirect timer of its own.
 *
 * Signed-out users go to /login; signed-in users without an allowed role are
 * bounced to their own role-home with an optional toast (never a dead-end).
 * Returns the current {@link GuardStatus}; callers render content only on
 * 'allowed' and a neutral loading view otherwise.
 */
export function useRouteGuard({
  allow,
  signedOutRedirect,
  roleMismatchToast,
}: RouteGuardOptions): GuardStatus {
  const { user, role, sessionState, hasRole } = useAuth()
  const { toast } = useApp()
  const router = useRouter()

  // --- decision: pure, synchronous, no role logic in effects ---
  let status: GuardStatus
  if (sessionState === 'pending') status = 'loading'
  else if (sessionState === 'anonymous') status = 'redirecting' // → /login
  else if (!user || role === null) status = 'loading' // authenticated, role still resolving
  else if (allow.some((r) => hasRole(r))) status = 'allowed'
  else status = 'redirecting' // signed in, wrong role → role-home

  // --- the only effect: perform the redirect (a real routing side-effect) ---
  useEffect(() => {
    if (status !== 'redirecting') return
    if (sessionState === 'anonymous') {
      const next = encodeURIComponent(router.asPath || '/')
      router.replace(signedOutRedirect ?? `/login?next=${next}`)
    } else if (role) {
      if (roleMismatchToast) toast(roleMismatchToast, 'info')
      router.replace(roleHome(role))
    }
  }, [status, sessionState, role, router, signedOutRedirect, roleMismatchToast, toast])

  return status
}
