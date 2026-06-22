/**
 * VolunteerSidebar - persistent left rail for the volunteer hub shell (/volunteer-hub/*).
 *
 * Renders the volunteer navigation (dashboard, pool, assigned, calendar, insights, chats)
 * plus a back-to-site footer link. Active state is derived from the current router pathname,
 * not stored. Labels come from the shared HE/EN translations (t.volunteerApp.nav), so the rail
 * is bilingual and RTL-safe via the reused admin-sidebar/* class system.
 *
 * Invariant: each NAV_ITEMS.key must exist on t.volunteerApp.nav, or its label renders blank.
 * The chats entry is `external` (lives outside the hub) so it never highlights as active.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  CalendarDays,
  BarChart3,
  MessagesSquare,
  Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// one entry in the rail. `key` indexes into t.volunteerApp.nav for the label;
// `exact` matches the path verbatim; `external` marks links outside the hub (never active).
interface NavItem {
  href: string
  key: string
  icon: LucideIcon
  exact?: boolean
  external?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/volunteer-hub', key: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/volunteer-hub/pool', key: 'pool', icon: Layers },
  { href: '/volunteer-hub/assigned', key: 'assigned', icon: ClipboardList },
  { href: '/volunteer-hub/calendar', key: 'calendar', icon: CalendarDays },
  { href: '/volunteer-hub/insights', key: 'insights', icon: BarChart3 },
  { href: '/chats', key: 'chats', icon: MessagesSquare, external: true },
]

// is this item the current page? exact items match only themselves; non-exact items
// also match nested routes (e.g. /volunteer-hub/pool/123). dashboard must be exact so it
// doesn't stay active for every /volunteer-hub/* child.
function isActive(pathname: string, item: NavItem) {
  if (item.external) return false
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

// stateless rail; reads only the router pathname and translation bundle. no props.
export default function VolunteerSidebar() {
  const { t } = useLanguage()
  const router = useRouter()
  const v = t.volunteerApp
  const nav = v.nav

  return (
    <aside className="admin-sidebar volapp-sidebar" aria-label={v.brand}>
      <div className="admin-sidebar-brand">
        <Link href="/volunteer-hub" className="admin-sidebar-brand-link">
          <span className="admin-sidebar-mark" aria-hidden="true">דחיפה</span>
          <span className="admin-sidebar-brand-name">{v.brand}</span>
        </Link>
      </div>

      <nav className="admin-sidebar-nav" aria-label={v.brand}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(router.pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="admin-nav-label">{nav[item.key as keyof typeof nav]}</span>
            </Link>
          )
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <Home size={20} aria-hidden="true" />
          <span className="admin-nav-label">{v.backToSite}</span>
        </Link>
      </div>
    </aside>
  )
}
