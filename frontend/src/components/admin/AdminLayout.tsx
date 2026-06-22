import type { ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'

interface AdminLayoutProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

/**
 * Presentational shell wrapping every /admin/* page (dashboard, requests,
 * volunteers, directory, categories, chats, insights). Renders a persistent
 * dark AdminSidebar (desktop) that collapses to a bottom tab bar on mobile,
 * an optional page header (title/subtitle/actions), and the page content.
 *
 * Pure layout: no auth/data logic here. Admin route-guarding lives in the
 * pages themselves; the global Navbar/Footer are hidden for /admin/* routes
 * in pages/_app.tsx so this shell owns the full chrome. All styling is global
 * CSS (admin-* classes); RTL is handled by logical properties in those rules.
 */
export default function AdminLayout({ title, subtitle, actions, children }: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        {/* header only renders when there is something to show; subtitle alone is intentionally not enough to draw the bar */}
        {(title || actions) && (
          <header className="admin-header">
            <div className="admin-header-text">
              {title && <h1 className="admin-header-title">{title}</h1>}
              {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="admin-header-actions">{actions}</div>}
          </header>
        )}
        {/* page-enter triggers the shared route-enter transition (honors prefers-reduced-motion) */}
        <main className="admin-content page-enter">{children}</main>
      </div>
    </div>
  )
}
