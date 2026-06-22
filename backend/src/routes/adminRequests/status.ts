/**
 * Admin status-change handler for a single request (#75), part of the
 * adminRequests router. Mounted at POST /api/admin/requests/:id/status and
 * called by the admin UI to move a request through its lifecycle.
 *
 * Flow: validate body -> transaction-guarded transition (lib/requestTransitions
 * is the canonical map, validated under role 'admin') -> post-commit side
 * effects (request event + audit log + chat.active sync + beneficiary notify).
 * Invariant: the status write commits in a Firestore transaction first; every
 * side effect runs only afterward and its failure never fails the response.
 * Responds { ok: true, status } on success, or 400/404/409/500 on failure.
 *
 * Extracted verbatim from the original single-file router.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { type Request, type Response } from 'express';
import { z } from 'zod';

import { db } from '@/lib/firebaseAdmin';
import { writeAuditLog } from '@/lib/audit';
import { writeRequestEvent } from '@/lib/requestEvents';
import { notifyBeneficiaryOfRequest } from '@/lib/notify';
import { REQUEST_STATUSES, type RequestStatus } from '@/routes/requests';
import { canTransition } from '@/lib/requestTransitions';
import { CHAT_END_STATES, setChatsActiveForRequest, TransitionError } from './shared';

// ── POST /api/admin/requests/:id/status ──────────────────────────────────
// Body: { to: RequestStatus }
// Fires 'status_changed' event (visibility 'all').
//
// Note 6 — transition-map-validated, race-safe status change. The lifecycle is
// an explicit transition map (lib/requestTransitions), not forward-only:
// admins may close (in_progress→closed or awaiting_review→closed), send back
// (awaiting_review→in_progress), reopen (closed→in_progress), reject, or start
// (pending→in_progress). Illegal moves return 409. The read-check-write runs in
// a Firestore transaction so concurrent admin edits can't clobber each other.
//
// `to` is the contract field; `status` is accepted as a legacy alias.
const statusSchema = z
  .object({
    to: z.enum(REQUEST_STATUSES).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
  })
  .refine((d) => Boolean(d.to ?? d.status), {
    message: 'to is required',
    path: ['to'],
  });

export async function changeStatus(req: Request, res: Response): Promise<void> {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const to = (parsed.data.to ?? parsed.data.status) as RequestStatus;
  const requestId = req.params.id;
  const actorId = req.user!.uid;
  const ref = db().collection('requests').doc(requestId);

  let prevStatus: string | null = null;

  try {
    // Read-check-write in a single transaction so concurrent admins can't race
    // past each other. Firestore retries the callback on contention; if it can't
    // commit (another writer won), runTransaction throws and we return 409.
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new TransitionError(404, 'not_found');
      }

      prevStatus = (snap.data()!.status as string) ?? null;

      // Admin transitions are validated against the canonical map. Admins are
      // exempt from the assignment requirement (isAssigned: true).
      if (!canTransition(prevStatus, to, { role: 'admin', isAssigned: true })) {
        throw new TransitionError(409, 'invalid_transition', {
          from: prevStatus,
          to,
        });
      }

      tx.update(ref, {
        status: to,
        // Every end state resolves any pending consent-close handshake
        // (req 25) so no stale, unresolvable proposal lingers on a request
        // the admin already closed, rejected or referred.
        ...(to === 'closed' || to === 'rejected' || to === 'referred'
          ? { closeRequest: null }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof TransitionError) {
      res.status(err.httpStatus).json({ error: err.code, ...err.extra });
      return;
    }
    // A Firestore ABORTED error (gRPC code 10) means the transaction lost a race
    // after exhausting retries — a genuine concurrent/stale write. Surface 409.
    const code = (err as { code?: number }).code;
    if (code === 10) {
      res.status(409).json({ error: 'concurrent_update' });
      return;
    }
    console.error('[adminRequests] POST /:id/status:', err);
    res.status(500).json({ error: 'internal_error' });
    return;
  }

  // Side effects run only after the status write committed successfully.
  try {
    await writeRequestEvent({
      requestId,
      type: 'status_changed',
      actorId,
      visibility: 'all',
      details: { from: prevStatus, to },
    });

    await writeAuditLog({
      actorId,
      action: 'request.status_change',
      entityType: 'requests',
      entityId: requestId,
      details: { from: prevStatus, to },
    });
  } catch (err) {
    // The status change itself succeeded; log the bookkeeping failure but still
    // report success so the admin UI reflects the committed state.
    console.error('[adminRequests] POST /:id/status side-effects:', err);
  }

  // Keep chats.active in sync with the request lifecycle: every end state
  // pauses the chat; an admin reopen (closed → in_progress) resumes it.
  if (CHAT_END_STATES.has(to)) {
    await setChatsActiveForRequest(requestId, false);
  } else if (to === 'in_progress' && prevStatus === 'closed') {
    await setChatsActiveForRequest(requestId, true);
  }

  // Notify the beneficiary when their request is closed (req 27).
  // Fire-and-forget: never let a notification failure break the response.
  if (to === 'closed') {
    void notifyBeneficiaryOfRequest(requestId, 'closed').catch((err) => {
      console.error('[adminRequests] notify closed failed:', err);
    });
  }

  res.json({ ok: true, status: to });
}
