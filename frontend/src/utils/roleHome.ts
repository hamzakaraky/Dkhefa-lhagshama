import type { Role } from '@/types'

// The stored role may legitimately be the legacy `businessOwner` value
// (see AuthContext.StoredRole). Treat it like any non-staff role → /requests.
type StoredRole = Role | 'businessOwner'

/**
 * The home page a signed-in user of a given role should land on.
 * admin → /admin, volunteer → /volunteer-hub, everyone else → /requests.
 * Used by AdminGate / VolunteerGate to bounce a signed-in role-mismatch to
 * their own area (instead of a dead-end access-denied card), and as the
 * canonical "role home" map for WS-1.
 */
export function roleHome(role: StoredRole | null | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'volunteer') return '/volunteer-hub'
  return '/requests'
}
