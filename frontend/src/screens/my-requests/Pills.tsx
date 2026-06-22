/*
 * Pills.tsx — presentational pill/field primitives for the beneficiary "my requests" screen.
 *
 * Three small, stateless components consumed by RequestCard.tsx to render a request's
 * meta row: lifecycle status badge, deadline countdown badge, and a labelled meta field.
 * Colors come from CSS-var palettes (STATUS_TONE for statuses, an inline palette for
 * deadlines); all user-facing text is resolved via the shared HE/EN translations node (t).
 * No data fetching or state — pure props in, markup out.
 */
import { Calendar } from "lucide-react";

import type { ReactNode } from "react";

import { STATUS_TONE } from "./shared";
import type { Translations } from "./shared";
import styles from "./Pills.module.css";

// status badge: maps a request status to its localized label + tone colors.
// unknown statuses fall back to the raw status string and the "pending" tone.
export function LifecycleStatusPill({ status, t }: { status: string; t: Translations }) {
  const label = t.lifecycle.statusLabels[status] || status;
  const tone = STATUS_TONE[status] || STATUS_TONE.pending;
  return (
    <span className={styles.statusPill} style={{ background: tone.bg, color: tone.fg }}>
      {label}
    </span>
  );
}

// deadline countdown badge. renders a neutral placeholder when no deadline is set.
// days-until is rounded from the ms diff (86400000 = 1 day); tone escalates as the
// deadline nears: overdue -> danger, <=3 days -> warning, else info.
export function DeadlinePill({ deadline, t }: { deadline?: string | null; t: Translations }) {
  if (!deadline) return <span className={styles.empty} aria-hidden="true">·</span>;
  const days = Math.round((new Date(deadline).getTime() - Date.now()) / 86400000);
  const overdue = days < 0;
  const label = t.myRequests.dueIn(days);
  const tone = overdue ? "danger" : days <= 3 ? "warning" : "info";
  const palette = {
    danger:  { bg: "var(--danger-soft)",  fg: "var(--danger)" },
    warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
    info:    { bg: "var(--sky-2)",        fg: "var(--ink-2)" },
  }[tone];
  return (
    <span className={styles.deadlinePill} style={{ background: palette.bg, color: palette.fg }}>
      <Calendar size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

// labelled meta field for a card row: optional icon + monospace label above the value (children).
export function MetaField({ icon, label, children }: { icon?: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.metaField}>
      <div className={styles.metaLabel}>
        {icon}
        {label}
      </div>
      <div className={styles.metaValue}>
        {children}
      </div>
    </div>
  );
}
