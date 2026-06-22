/*
 * helpers for the admin request-detail screen.
 *
 * pure, render-free building blocks shared by the request-detail view: a typed
 * accessor into the (HE/EN) admin copy, the timeline event-to-label formatter,
 * and the small MetaCell presentational component for the request summary grid.
 * kept out of the screen module so they stay testable and never remount.
 *
 * key invariant: eventLabel resolves a stored volunteer uid back to a display
 * name via the loaded active-volunteers list, so the timeline never leaks raw
 * database ids. all label text comes from AdminCopy (no hardcoded strings).
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AdminCopy, ActiveVolunteer, RequestEvent } from './types'
import styles from './helpers.module.css'

// Read a flat (string) reqDetail key, narrowing away the nested MatchingCopy
// (WS-6) so timeline labels stay typed as plain strings.
export function rdStr(a: AdminCopy, key: string): string {
  const v = a.reqDetail[key]
  return typeof v === 'string' ? v : ''
}

// Format one timeline RequestEvent into a localized human-readable label.
// Each event type pulls its phrasing from AdminCopy and unpacks the event's
// loosely-typed details; falls back to the raw ev.type for unknown events.
export function eventLabel(ev: RequestEvent, a: AdminCopy, volunteers: ActiveVolunteer[]): string {
  switch (ev.type) {
    case 'assigned': {
      // The 'assigned' event stores the raw volunteer uid; resolve it to a
      // display name from the loaded active-volunteers list so the timeline
      // shows a name (like the list page and the assigned label do), not a
      // 28-char database id. Fall back to the uid if the volunteer is no longer
      // in the active list (e.g. later deactivated).
      const uid = ev.details && typeof ev.details.volunteerId === 'string' ? ev.details.volunteerId : ''
      const name = volunteers.find((v) => v.uid === uid)?.fullName || uid
      return `${a.reqDetail.assign}: ${name}`
    }
    case 'status_changed':
      return `${a.reqDetail.changeStatus}: ${
        (ev.details && ev.details.to && a.statusLabels[ev.details.to]) || (ev.details && ev.details.to) || ''
      }`
    case 'note_added':
      return (ev.details && ev.details.note) || rdStr(a, 'addNote')
    // req 25 — consent-close handshake trail: details carry
    // { action: 'proposed'|'approved'|'declined', role: 'volunteer'|'beneficiary' }.
    case 'close_consent': {
      const action = typeof ev.details?.action === 'string' ? ev.details.action : ''
      const role = typeof ev.details?.role === 'string' ? ev.details.role : ''
      const base =
        action === 'declined'
          ? rdStr(a, 'closeConsentDeclined')
          : action === 'approved'
            ? rdStr(a, 'closeConsentApproved')
            : rdStr(a, 'closeConsentProposed')
      const roleLabel = (role && a.roleLabels[role]) || role
      return roleLabel ? `${base} (${roleLabel})` : base
    }
    default:
      return ev.type
  }
}

// A meta cell in the request summary: a labelled value with a quiet icon.
// Declared at module scope (not inside render) so it never remounts.
interface MetaCellProps {
  icon: LucideIcon
  label: ReactNode
  children: ReactNode
}

// Renders one icon + dt/dd pair for the summary grid; children is the value.
export function MetaCell({ icon: Icon, label, children }: MetaCellProps) {
  return (
    <div className={styles.metaCell}>
      <span aria-hidden="true" className={styles.metaIcon}>
        <Icon size={17} />
      </span>
      <div className={styles.metaBody}>
        <dt className={styles.metaLabel}>{label}</dt>
        <dd className={styles.metaValue}>{children}</dd>
      </div>
    </div>
  )
}
