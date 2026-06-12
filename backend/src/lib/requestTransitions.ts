/**
 * Request status lifecycle — canonical state machine (Note 6).
 *
 * The status lifecycle is NOT forward-only. It is an explicit transition map
 * with role + assignment gates. This module is the single authority: every
 * status-changing endpoint (`/done`, admin `/status`, `/refer`, `/archive`)
 * validates moves through {@link canTransition} so the rules can never drift
 * apart across routes.
 *
 * `archived` is a SEPARATE boolean flag on the request — it is not a status
 * value. Archived requests stay queryable for stats; active lists exclude
 * `archived === true`. The transition map below governs only `status`.
 *
 * Legacy `resolved` is RETIRED — the rating prompt now keys off `closed`.
 */

/** Canonical request status enum. Order is not significant (no forward-only). */
export const REQUEST_STATUSES = [
  'pending',
  'in_progress',
  'awaiting_review',
  'closed',
  'rejected',
  'referred',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Roles that can act on a request transition. */
export type TransitionRole = 'admin' | 'volunteer';

/**
 * Transition map (mirrors the spec TRANSITION MAP table):
 *
 * | from            | allowed to                  | who                          |
 * |-----------------|-----------------------------|------------------------------|
 * | pending         | in_progress, rejected       | admin                        |
 * | in_progress     | awaiting_review             | assigned volunteer (or admin)|
 * | in_progress     | closed (one-step close)     | admin                        |
 * | in_progress     | referred, rejected          | admin                        |
 * | awaiting_review | closed                      | admin                        |
 * | awaiting_review | in_progress (send back)     | admin                        |
 * | closed          | in_progress (reopen)        | admin                        |
 *
 * `referred` is terminal (counts as helped) and additionally sets
 * `archived=true` at the route level. `rejected` and `closed` are otherwise
 * terminal for status purposes (closed may be reopened by an admin).
 */
interface TransitionRule {
  to: RequestStatus;
  /** Roles allowed to perform this transition. */
  roles: TransitionRole[];
  /**
   * When true, a `volunteer` actor must also be the assigned handler of the
   * request (admins are exempt). Used for the volunteer "mark as done" move.
   */
  requiresAssignment?: boolean;
}

const TRANSITIONS: Record<RequestStatus, TransitionRule[]> = {
  pending: [
    { to: 'in_progress', roles: ['admin'] },
    { to: 'rejected', roles: ['admin'] },
  ],
  in_progress: [
    // Assigned volunteer marks done → awaiting_review (admin may also do it).
    { to: 'awaiting_review', roles: ['admin', 'volunteer'], requiresAssignment: true },
    // Admin one-step close — an admin alone may close without the
    // awaiting_review stop (the volunteer+beneficiary consent path stays in
    // lib/closeConsent, which bypasses this map).
    { to: 'closed', roles: ['admin'] },
    { to: 'referred', roles: ['admin'] },
    { to: 'rejected', roles: ['admin'] },
  ],
  awaiting_review: [
    { to: 'closed', roles: ['admin'] },
    { to: 'in_progress', roles: ['admin'] }, // send back
  ],
  closed: [
    { to: 'in_progress', roles: ['admin'] }, // reopen
  ],
  rejected: [],
  referred: [],
};

export interface TransitionActor {
  role: TransitionRole | undefined;
  /** True when the actor is the assigned handler/volunteer of the request. */
  isAssigned: boolean;
}

/**
 * Whether a transition from `from` → `to` is allowed for the given actor.
 *
 * - `to` must be a legal target of `from` in the map.
 * - The actor's role must be permitted for that edge.
 * - If the edge `requiresAssignment` and the actor is a (non-admin) volunteer,
 *   the actor must be the assigned handler. Admins bypass the assignment check.
 */
export function canTransition(
  from: string | null | undefined,
  to: string,
  actor: TransitionActor,
): boolean {
  if (!from || !REQUEST_STATUSES.includes(from as RequestStatus)) return false;
  if (!REQUEST_STATUSES.includes(to as RequestStatus)) return false;

  const rule = TRANSITIONS[from as RequestStatus].find((r) => r.to === to);
  if (!rule) return false;

  const role = actor.role;
  if (!role || !rule.roles.includes(role)) return false;

  if (rule.requiresAssignment && role === 'volunteer' && !actor.isAssigned) {
    return false;
  }

  return true;
}

/** Statuses that may be archived (admin sets the boolean flag). */
export const ARCHIVABLE_STATUSES: readonly RequestStatus[] = ['closed', 'referred'];

/** Whether a request in `status` may be archived. */
export function canArchive(status: string | null | undefined): boolean {
  return ARCHIVABLE_STATUSES.includes(status as RequestStatus);
}
