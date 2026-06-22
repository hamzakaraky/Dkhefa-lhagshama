/**
 * Admin approval-queue routes (UC-05). Mounted at /api/admin; every route is
 * gated by authenticate + requireRole('admin'). Governs the moderation
 * lifecycle of submitted businesses + answers (ngo/partner orgs): list pending,
 * then approve / reject / request-changes. Each mutation stamps the actor +
 * server timestamp on the doc and appends an immutable audit-log entry. Status
 * is the single source of truth: pending -> approved | rejected | needs_changes.
 */
import { Router, Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { db } from '@/lib/firebaseAdmin';
import { authenticate, requireRole } from '@/middleware/auth';
import { writeAuditLog } from '@/lib/audit';

const router = Router();

// All routes require a verified admin token
router.use(authenticate, requireRole('admin'));

// Approvable collections. `organizations` was removed: nothing writes to that
// collection — orgs live in `answers`, split by orgType (ngo / partner). The
// z.enum below now rejects 'organizations' as an invalid entityType (400).
const ENTITY_TYPES = ['businesses', 'answers'] as const;

const actionSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId:   z.string().min(1),
  note:       z.string().max(500).optional(),
});

// GET /api/admin/pending — fan-out a status=='pending' query across every
// approvable collection, normalize each doc, and return { items } newest-first.
router.get('/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshots = await Promise.all(
      ENTITY_TYPES.map((entityType) =>
        db()
          .collection(entityType)
          .where('status', '==', 'pending')
          .get()
          .then((snap) =>
            snap.docs.map((doc) => {
              // F8: drop the internal ownerId from the admin listing — the
              // approvals UI doesn't use it, and it's an internal uid.
              const data = doc.data();
              delete data.ownerId;
              // Convert Firestore Timestamps to ISO strings so `createdAt`
              // (and `updatedAt`) match the contract every other answers/
              // businesses/requests list endpoint emits — otherwise this
              // payload carries `{_seconds,_nanoseconds}` objects, and any
              // consumer doing `new Date(item.createdAt)` gets Invalid Date.
              return {
                id: doc.id,
                entityType,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
              };
            })
          )
      )
    );

    // Newest-first by `createdAt` — the field both pending collections
    // (businesses, answers) actually write at creation (serverTimestamp). The
    // previous key `submittedAt` was never written, so every item scored 0 and
    // the queue fell back to Firestore's arbitrary insertion order. createdAt is
    // now an ISO string (converted in the mapper above), so sort lexically — ISO
    // 8601 strings sort chronologically — with null/missing values sinking last.
    const items = (snapshots.flat() as Array<Record<string, unknown>>).sort(
      (a, b) => {
        const aTime = typeof a.createdAt === 'string' ? a.createdAt : '';
        const bTime = typeof b.createdAt === 'string' ? b.createdAt : '';
        return bTime.localeCompare(aTime);
      }
    );

    res.json({ items });
  } catch (err) {
    console.error('[admin] GET /pending:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/admin/approve — body { entityType, entityId, note? } (actionSchema).
// 400 invalid_input / 404 not_found, else sets status='approved' + approver
// stamps, writes an audit log, and returns { ok: true }.
router.post('/approve', async (req: Request, res: Response): Promise<void> => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }
  const { entityType, entityId, note } = parsed.data;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection(entityType).doc(entityId);
    if (!(await ref.get()).exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    await ref.update({
      status: 'approved',
      approvedBy: actorId,
      approvedAt: FieldValue.serverTimestamp(),
      ...(note ? { approvalNote: note } : {}),
    });

    await writeAuditLog({
      actorId,
      action: 'approve',
      entityType,
      entityId,
      details: { note: note ?? null },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] POST /approve:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/admin/reject — same contract as /approve; sets status='rejected'
// + rejecter stamps, audit-logs, returns { ok: true }.
router.post('/reject', async (req: Request, res: Response): Promise<void> => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }
  const { entityType, entityId, note } = parsed.data;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection(entityType).doc(entityId);
    if (!(await ref.get()).exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    await ref.update({
      status: 'rejected',
      rejectedBy: actorId,
      rejectedAt: FieldValue.serverTimestamp(),
      ...(note ? { rejectionNote: note } : {}),
    });

    await writeAuditLog({
      actorId,
      action: 'reject',
      entityType,
      entityId,
      details: { note: note ?? null },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] POST /reject:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/admin/request-changes — same contract as /approve; sets
// status='needs_changes' + requester stamps, audit-logs, returns { ok: true }.
router.post('/request-changes', async (req: Request, res: Response): Promise<void> => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }
  const { entityType, entityId, note } = parsed.data;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection(entityType).doc(entityId);
    if (!(await ref.get()).exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    await ref.update({
      status: 'needs_changes',
      changesRequestedBy: actorId,
      changesRequestedAt: FieldValue.serverTimestamp(),
      ...(note ? { changesNote: note } : {}),
    });

    await writeAuditLog({
      actorId,
      action: 'request_changes',
      entityType,
      entityId,
      details: { note: note ?? null },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] POST /request-changes:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
