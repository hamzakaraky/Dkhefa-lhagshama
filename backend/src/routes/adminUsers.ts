/**
 * /api/admin/users — Admin-only user management (#76).
 *
 * Endpoints:
 *   GET  /api/admin/users              — list users from users/{uid} collection
 *   POST /api/admin/users/:uid/promote — promote user to a given role (sets custom claim + users/{uid}.role)
 *   POST /api/admin/users/:uid/demote  — demote back to 'beneficiary' (default role)
 *   POST /api/admin/users/:uid/disable — set users/{uid}.disabled = true (soft deactivation)
 *   POST /api/admin/users/:uid/enable  — re-enable a disabled user
 *
 * Role management goes through Firebase Auth custom claims (Admin SDK) +
 * mirrors the role into users/{uid}.role for quick Firestore queries.
 * Disabling a user sets `disabled: true` on the users/{uid} doc; it does NOT
 * call Firebase Auth disableUser (that would block sign-in entirely).
 * If hard lock-out is needed, call Firebase Auth directly from the admin UI.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { db, auth as adminAuth } from '@/lib/firebaseAdmin';
import { authenticate, requireRole, type Role } from '@/middleware/auth';
import { writeAuditLog } from '@/lib/audit';

const router = Router();
router.use(authenticate, requireRole('admin'));

const ROLES: Role[] = ['beneficiary', 'businessOwner', 'volunteer', 'admin'];

// ── GET /api/admin/users ──────────────────────────────────────────────────
// Reads from the users/{uid} Firestore collection (mirrored from Auth).
// Query params: role, limit (default 50)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, limit: limitStr } = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);

    let query = db().collection('users').orderBy('createdAt', 'desc').limit(limit) as
      FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (role && ROLES.includes(role as Role)) {
      query = query.where('role', '==', role);
    }

    const snap = await query.get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        role: data.role ?? null,
        disabled: data.disabled ?? false,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('[adminUsers] GET /:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

const promoteSchema = z.object({
  role: z.enum(['beneficiary', 'businessOwner', 'volunteer', 'admin']),
});

// ── POST /api/admin/users/:uid/promote ───────────────────────────────────
router.post('/:uid/promote', async (req: Request, res: Response): Promise<void> => {
  const parsed = promoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }

  const { role } = parsed.data;
  const targetUid = req.params.uid;
  const actorId = req.user!.uid;

  try {
    const userRef = db().collection('users').doc(targetUid);
    const userSnap = await userRef.get();

    const prevRole = userSnap.exists ? (userSnap.data()!.role ?? null) : null;

    // Set custom claim
    await adminAuth().setCustomUserClaims(targetUid, { role });

    // Mirror into users/{uid}
    await userRef.set(
      {
        role,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actorId,
      },
      { merge: true }
    );

    await writeAuditLog({
      actorId,
      action: 'user.promote',
      entityType: 'users',
      entityId: targetUid,
      details: { from: prevRole, to: role },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminUsers] POST /:uid/promote:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/users/:uid/demote ────────────────────────────────────
// Resets role to 'beneficiary' (the default).
router.post('/:uid/demote', async (req: Request, res: Response): Promise<void> => {
  const targetUid = req.params.uid;
  const actorId = req.user!.uid;

  try {
    const userRef = db().collection('users').doc(targetUid);
    const userSnap = await userRef.get();
    const prevRole = userSnap.exists ? (userSnap.data()!.role ?? null) : null;

    await adminAuth().setCustomUserClaims(targetUid, { role: 'beneficiary' });

    await userRef.set(
      {
        role: 'beneficiary',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actorId,
      },
      { merge: true }
    );

    await writeAuditLog({
      actorId,
      action: 'user.demote',
      entityType: 'users',
      entityId: targetUid,
      details: { from: prevRole, to: 'beneficiary' },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminUsers] POST /:uid/demote:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/users/:uid/disable ───────────────────────────────────
// Soft-disable: sets users/{uid}.disabled = true. Does NOT lock Firebase Auth.
router.post('/:uid/disable', async (req: Request, res: Response): Promise<void> => {
  const targetUid = req.params.uid;
  const actorId = req.user!.uid;

  try {
    await db()
      .collection('users')
      .doc(targetUid)
      .set(
        {
          disabled: true,
          disabledBy: actorId,
          disabledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await writeAuditLog({
      actorId,
      action: 'user.disable',
      entityType: 'users',
      entityId: targetUid,
      details: {},
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminUsers] POST /:uid/disable:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/admin/users/:uid/enable ────────────────────────────────────
router.post('/:uid/enable', async (req: Request, res: Response): Promise<void> => {
  const targetUid = req.params.uid;
  const actorId = req.user!.uid;

  try {
    await db()
      .collection('users')
      .doc(targetUid)
      .set(
        {
          disabled: false,
          enabledBy: actorId,
          enabledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await writeAuditLog({
      actorId,
      action: 'user.enable',
      entityType: 'users',
      entityId: targetUid,
      details: {},
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminUsers] POST /:uid/enable:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
