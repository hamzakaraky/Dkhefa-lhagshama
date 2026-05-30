/**
 * /api/admin/requests — Admin-only request management endpoints (#75).
 *
 * Endpoints:
 *   GET  /api/admin/requests         — list + filter all requests
 *   GET  /api/admin/requests/:id     — single request detail
 *   POST /api/admin/requests/:id/assign   — assign a volunteer
 *   POST /api/admin/requests/:id/status   — change status
 *   POST /api/admin/requests/:id/note     — add internal note
 *
 * All writes: Admin SDK (bypasses Firestore rules).
 * Every mutating action emits a requestEvent + writeAuditLog.
 * The assign endpoint also triggers chat-on-assign (#71) via chats module.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { db } from '@/lib/firebaseAdmin';
import { authenticate, requireRole } from '@/middleware/auth';
import { writeAuditLog } from '@/lib/audit';
import { writeRequestEvent } from '@/lib/requestEvents';
import { REQUEST_STATUSES, type RequestStatus } from '@/routes/requests';
import { ensureChatForRequest } from '@/lib/chatOnAssign';

const router = Router();
router.use(authenticate, requireRole('admin'));

// ── GET /api/admin/requests ───────────────────────────────────────────────
// Optional query params: status, category, urgency, limit (default 50)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, urgency, limit: limitStr } = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);

    let query = db().collection('requests').orderBy('createdAt', 'desc').limit(limit) as
      FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (status && REQUEST_STATUSES.includes(status as RequestStatus)) {
      query = query.where('status', '==', status);
    }
    if (category) {
      query = query.where('category', '==', category);
    }
    if (urgency) {
      query = query.where('urgency', '==', urgency);
    }

    const snap = await query.get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        beneficiaryId:        data.beneficiaryId,
        firstName:            data.firstName,
        lastName:             data.lastName,
        email:                data.email,
        phone:                data.phone,
        city:                 data.city,
        category:             data.category,
        urgency:              data.urgency,
        status:               data.status,
        description:          data.description,
        assignedVolunteerId:  data.assignedVolunteerId ?? null,
        handler:              data.handler ?? null,
        deadline:             data.deadline ?? null,
        notes:                data.notes ?? '',
        createdAt:            data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt:            data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        assignedAt:           data.assignedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('[adminRequests] GET /:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── GET /api/admin/requests/:id ───────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db().collection('requests').doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const data = snap.data()!;

    // Also fetch request events for the timeline
    const eventsSnap = await db()
      .collection('requestEvents')
      .where('requestId', '==', req.params.id)
      .orderBy('createdAt', 'asc')
      .get();

    const events = eventsSnap.docs.map((e) => {
      const ev = e.data();
      return {
        id: e.id,
        type: ev.type,
        actorId: ev.actorId,
        visibility: ev.visibility,
        details: ev.details ?? {},
        createdAt: ev.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    res.json({
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      assignedAt: data.assignedAt?.toDate?.()?.toISOString?.() ?? null,
      events,
    });
  } catch (err) {
    console.error('[adminRequests] GET /:id:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/requests/:id/assign ──────────────────────────────────
// Body: { volunteerId: string }
// Sets assignedVolunteerId + assignedAt, fires 'assigned' event.
// Also calls ensureChatForRequest to create/guarantee a chat (#71).
const assignSchema = z.object({
  volunteerId: z.string().min(1),
});

router.post('/:id/assign', async (req: Request, res: Response): Promise<void> => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const { volunteerId } = parsed.data;
  const requestId = req.params.id;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection('requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const data = snap.data()!;
    const prevVolunteerId = data.assignedVolunteerId ?? null;

    await ref.update({
      assignedVolunteerId: volunteerId,
      assignedAt: FieldValue.serverTimestamp(),
      handler: volunteerId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeRequestEvent({
      requestId,
      type: 'assigned',
      actorId,
      visibility: 'all',
      details: { volunteerId, prevVolunteerId },
    });

    await writeAuditLog({
      actorId,
      action: 'request.assign',
      entityType: 'requests',
      entityId: requestId,
      details: { volunteerId, prevVolunteerId },
    });

    // Create chat between beneficiary and volunteer (#71)
    await ensureChatForRequest({
      requestId,
      beneficiaryId: data.beneficiaryId as string,
      volunteerId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminRequests] POST /:id/assign:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/requests/:id/status ──────────────────────────────────
// Body: { status: RequestStatus }
// Fires 'status_changed' event (visibility 'all').
const statusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
});

router.post('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const { status } = parsed.data;
  const requestId = req.params.id;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection('requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const prevStatus = (snap.data()!.status as string) ?? null;

    await ref.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeRequestEvent({
      requestId,
      type: 'status_changed',
      actorId,
      visibility: 'all',
      details: { from: prevStatus, to: status },
    });

    await writeAuditLog({
      actorId,
      action: 'request.status_change',
      entityType: 'requests',
      entityId: requestId,
      details: { from: prevStatus, to: status },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminRequests] POST /:id/status:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/requests/:id/note ────────────────────────────────────
// Body: { note: string }
// Fires 'note_added' event with visibility 'internal'.
const noteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
});

router.post('/:id/note', async (req: Request, res: Response): Promise<void> => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const { note } = parsed.data;
  const requestId = req.params.id;
  const actorId = req.user!.uid;

  try {
    const ref = db().collection('requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Append to the notes field (pipe-delimited, timestamped)
    const prevNotes = (snap.data()!.notes as string) ?? '';
    const timestamp = new Date().toISOString();
    const updatedNotes = prevNotes
      ? `${prevNotes}\n[${timestamp}] ${actorId}: ${note}`
      : `[${timestamp}] ${actorId}: ${note}`;

    await ref.update({
      notes: updatedNotes,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeRequestEvent({
      requestId,
      type: 'note_added',
      actorId,
      visibility: 'internal',
      details: { note },
    });

    await writeAuditLog({
      actorId,
      action: 'request.note_added',
      entityType: 'requests',
      entityId: requestId,
      details: { noteLength: note.length },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminRequests] POST /:id/note:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
