/**
 * /api/admin/insights — Admin analytics aggregation (Note 7).
 *
 * Computes the InsightsData payload on request from `requests` + `requestEvents`
 * (the per-transition timestamp trail). Replaces the dead mock charts in the
 * admin dashboard. Admin-only.
 *
 *   GET /api/admin/insights
 *     {
 *       overTime:    [{ date: 'YYYY-MM-DD', count }],   // requests created/day
 *       byCategory:  [{ category, count }],
 *       byStatus:    [{ status, count }],               // current status
 *       avgResolutionDays: number | null,               // mean created→closed
 *       perVolunteer: [{ uid, name, count }]            // assigned-request load
 *     }
 *
 * Archived requests ARE included (Note 6: archived counts toward stats).
 */
import { Router, type Request, type Response } from 'express';

import { db } from '@/lib/firebaseAdmin';
import { authenticate, requireRole } from '@/middleware/auth';

const router = Router();
router.use(authenticate, requireRole('admin'));

interface RequestDoc {
  category?: string;
  status?: string;
  assignedVolunteerId?: string | null;
  handler?: string | null;
  createdAt?: { toDate?: () => Date };
}

function toDate(ts: { toDate?: () => Date } | undefined | null): Date | null {
  const d = ts?.toDate?.();
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── GET /api/admin/insights ───────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1) All requests — small NGO dataset, a single read is fine.
    const reqSnap = await db().collection('requests').get();

    const overTimeMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();
    const perVolunteerMap = new Map<string, number>();
    const createdAtById = new Map<string, Date>();

    for (const doc of reqSnap.docs) {
      const data = doc.data() as RequestDoc;

      const created = toDate(data.createdAt);
      if (created) {
        const key = dayKey(created);
        overTimeMap.set(key, (overTimeMap.get(key) ?? 0) + 1);
        createdAtById.set(doc.id, created);
      }

      if (data.category) {
        byCategoryMap.set(data.category, (byCategoryMap.get(data.category) ?? 0) + 1);
      }

      if (data.status) {
        byStatusMap.set(data.status, (byStatusMap.get(data.status) ?? 0) + 1);
      }

      const vol = data.assignedVolunteerId ?? data.handler ?? null;
      if (vol) {
        perVolunteerMap.set(vol, (perVolunteerMap.get(vol) ?? 0) + 1);
      }
    }

    // 2) avgResolutionDays — mean (closed_at − created_at) over requests that
    //    have a status_changed → closed event. Derived from requestEvents.
    const eventsSnap = await db()
      .collection('requestEvents')
      .where('type', '==', 'status_changed')
      .get();

    // For each request, the earliest event whose details.to === 'closed'.
    const closedAtById = new Map<string, Date>();
    for (const e of eventsSnap.docs) {
      const ev = e.data() as {
        requestId?: string;
        details?: { to?: string };
        createdAt?: { toDate?: () => Date };
      };
      if (ev.details?.to !== 'closed' || !ev.requestId) continue;
      const at = toDate(ev.createdAt);
      if (!at) continue;
      const existing = closedAtById.get(ev.requestId);
      if (!existing || at < existing) {
        closedAtById.set(ev.requestId, at);
      }
    }

    const durationsDays: number[] = [];
    for (const [id, closedAt] of closedAtById) {
      const created = createdAtById.get(id);
      if (!created) continue;
      const ms = closedAt.getTime() - created.getTime();
      if (ms >= 0) durationsDays.push(ms / (1000 * 60 * 60 * 24));
    }
    const avgResolutionDays =
      durationsDays.length > 0
        ? Number(
            (durationsDays.reduce((a, b) => a + b, 0) / durationsDays.length).toFixed(1),
          )
        : null;

    // 3) Resolve volunteer display names from the `volunteers` collection
    //    (best-effort; falls back to the uid).
    const volunteerIds = [...perVolunteerMap.keys()];
    const nameByUid = new Map<string, string>();
    await Promise.all(
      volunteerIds.map(async (uid) => {
        try {
          const vSnap = await db().collection('volunteers').doc(uid).get();
          const v = vSnap.exists ? (vSnap.data() as { name?: string; fullName?: string }) : null;
          nameByUid.set(uid, v?.name ?? v?.fullName ?? uid);
        } catch {
          nameByUid.set(uid, uid);
        }
      }),
    );

    const overTime = [...overTimeMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byCategory = [...byCategoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const byStatus = [...byStatusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const perVolunteer = [...perVolunteerMap.entries()]
      .map(([uid, count]) => ({ uid, name: nameByUid.get(uid) ?? uid, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ overTime, byCategory, byStatus, avgResolutionDays, perVolunteer });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[adminInsights] GET /:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
