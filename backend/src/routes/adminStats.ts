/**
 * /api/admin/stats — Admin dashboard aggregate counts (#77).
 *
 * Returns lightweight counts for the admin dashboard stat cards. Uses
 * Firestore aggregate count() queries so we never page through documents.
 *
 *   GET /api/admin/stats
 *     {
 *       openRequests, inProgressRequests, resolvedRequests, totalRequests,
 *       helped,                      // closed + referred (people we helped)
 *       activeVolunteers, pendingVolunteers,
 *       totalUsers
 *     }
 *
 * Status vocabulary mirrors REQUEST_STATUSES in lib/requestTransitions.ts:
 *   pending | in_progress | awaiting_review | closed | rejected | referred
 * (Note 6 — legacy `resolved` is retired; `helped` = closed + referred.)
 */
import { Router, type Request, type Response } from 'express';

import { db } from '@/lib/firebaseAdmin';
import { authenticate, requireRole } from '@/middleware/auth';

const router = Router();
router.use(authenticate, requireRole('admin'));

type WhereOp = FirebaseFirestore.WhereFilterOp;

async function count(
  collection: string,
  field?: string,
  op?: WhereOp,
  value?: unknown,
): Promise<number> {
  let query: FirebaseFirestore.Query = db().collection(collection);
  if (field && op) {
    query = query.where(field, op, value as never);
  }
  const snap = await query.count().get();
  return snap.data().count;
}

/**
 * Count volunteers that have at least one `requestedCategories` entry awaiting
 * review (status === 'pending'). `requestedCategories` is an array of objects on
 * the volunteer doc, so we scan the (small) collection and filter in memory
 * rather than relying on a composite/array query.
 */
async function countPendingCategoryRequests(): Promise<number> {
  const snap = await db().collection('volunteers').get();
  let pending = 0;
  for (const doc of snap.docs) {
    const reqs = (doc.data() as { requestedCategories?: Array<{ status?: string }> })
      .requestedCategories;
    if (Array.isArray(reqs) && reqs.some((r) => r?.status === 'pending')) {
      pending += 1;
    }
  }
  return pending;
}

// ── GET /api/admin/stats ───────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      openRequests,
      inProgressRequests,
      closedRequests,
      referredRequests,
      totalRequests,
      activeVolunteers,
      pendingVolunteers,
      totalUsers,
      requestsWithClaims,
      pendingCategoryRequests,
    ] = await Promise.all([
      count('requests', 'status', '==', 'pending'),
      count('requests', 'status', '==', 'in_progress'),
      count('requests', 'status', '==', 'closed'),
      count('requests', 'status', '==', 'referred'),
      count('requests'),
      count('volunteers', 'active', '==', true),
      count('volunteerApplications', 'status', '==', 'pending'),
      count('users'),
      // "Needs attention": requests flagged as having claims.
      count('requests', 'hasClaims', '==', true),
      // Volunteers with at least one requestedCategories entry pending review.
      // Small dataset → get() + in-memory filter (avoids a composite index on a
      // nested array field, which Firestore can't single-field query anyway).
      countPendingCategoryRequests(),
    ]);

    // "Helped" = requests we brought to a positive close, plus those referred
    // to a partner (Note 6/8 — both count as helped).
    const helped = closedRequests + referredRequests;

    res.json({
      openRequests,
      inProgressRequests,
      // `resolvedRequests` kept as a back-compat alias (= closed) so the
      // existing dashboard card key doesn't silently render 0.
      resolvedRequests: closedRequests,
      closedRequests,
      referredRequests,
      totalRequests,
      helped,
      activeVolunteers,
      pendingVolunteers,
      totalUsers,
      // Operational "needs attention" counts for the admin dashboard.
      requestsWithClaims,
      pendingCategoryRequests,
    });
  } catch (err) {
    console.error('[adminStats] GET /:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
