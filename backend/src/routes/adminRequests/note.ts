/**
 * Admin-only handler for adding an internal staff note to a request (#75).
 *
 * Route: POST /api/admin/requests/:id/note (mounted by the adminRequests router,
 * already behind admin auth). Appends a timestamped line to the request's `notes`
 * field and records the action in two places: a request-timeline event
 * (visibility 'internal', so beneficiaries never see it) via writeRequestEvent,
 * and the global audit log via writeAuditLog.
 *
 * Invariant: `notes` is a single newline-delimited string built by appending,
 * not an array. Each note is one "[iso-ts] actorUid: text" line. Extracted verbatim
 * from the original single-file router.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { type Request, type Response } from 'express';
import { z } from 'zod';

import { db } from '@/lib/firebaseAdmin';
import { writeAuditLog } from '@/lib/audit';
import { writeRequestEvent } from '@/lib/requestEvents';

// request body shape: non-empty trimmed note, capped at 2000 chars.
const noteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
});

// POST /api/admin/requests/:id/note. validates body against noteSchema,
// 404s on missing request, appends the note, logs the event + audit entry,
// and responds { ok: true } (400 on bad body, 500 on write failure).
export async function addNote(req: Request, res: Response): Promise<void> {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const { note } = parsed.data;
  const requestId = req.params.id;
  // non-null assertion is safe: admin auth middleware populates req.user upstream.
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
}
