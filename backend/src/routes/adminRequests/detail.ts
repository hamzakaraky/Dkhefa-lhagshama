/**
 * Admin request-detail handler (#75) for GET /api/admin/requests/:id.
 *
 * Loads one `requests` doc plus its `requestEvents` timeline and returns a
 * single serialized payload for the admin request-detail screen. All Firestore
 * Timestamps are converted to ISO strings (or null) so the client gets plain
 * JSON. Mounted under the admin router, so auth/role gating lives upstream.
 * Extracted verbatim from the original single-file router.
 */
import { type Request, type Response } from 'express';

import { db } from '@/lib/firebaseAdmin';

// ── GET /api/admin/requests/:id ───────────────────────────────────────────
// validates the request exists (404 `not_found` otherwise); responds with the
// flattened request fields + normalized booleans/provenance + ISO timestamps +
// an ascending `events` timeline. failures log and return 500 `internal_error`.
export async function getRequestDetail(req: Request, res: Response): Promise<void> {
  try {
    const snap = await db().collection('requests').doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const data = snap.data()!;

    // Also fetch request events for the timeline. We sort client-side by
    // createdAt (ascending) instead of Firestore's orderBy so this equality
    // query needs no composite index — the per-request event set is small.
    const eventsSnap = await db()
      .collection('requestEvents')
      .where('requestId', '==', req.params.id)
      .get();

    const events = eventsSnap.docs
      .map((e) => {
        const ev = e.data();
        return {
          id: e.id,
          type: ev.type,
          actorId: ev.actorId,
          visibility: ev.visibility,
          details: ev.details ?? {},
          createdAt: ev.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
      })
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

    // Serialize the referral's server timestamp to ISO if present (Note 8).
    const referral = data.referral
      ? {
          ...data.referral,
          referredAt:
            data.referral.referredAt?.toDate?.()?.toISOString?.() ??
            data.referral.referredAt ??
            null,
        }
      : null;

    res.json({
      id: snap.id,
      ...data,
      archived: data.archived === true,
      // Volunteer-on-behalf provenance (UC-01 A2) for the admin UI badge.
      onBehalf: data.onBehalf === true,
      submittedBy: data.submittedBy ?? null,
      submittedByRole: data.submittedByRole ?? null,
      // WS-6: the matcher + the request-detail "why" panel need the chosen
      // language. `...data` already spreads it, but spell it out so the value
      // is explicitly normalized to null when absent on legacy docs.
      preferredLanguage: (data.preferredLanguage as string | null | undefined) ?? null,
      attachments: data.attachments ?? [],
      referral,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      assignedAt: data.assignedAt?.toDate?.()?.toISOString?.() ?? null,
      events,
    });
  } catch (err) {
    console.error('[adminRequests] GET /:id:', err);
    res.status(500).json({ error: 'internal_error' });
  }
}
