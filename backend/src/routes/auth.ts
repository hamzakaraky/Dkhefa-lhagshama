/**
 * Auth routes — sets the default `beneficiary` role on registration.
 *
 * The actual sign-up (createUserWithEmailAndPassword) happens on the client
 * via the Firebase Web SDK. After it succeeds, the client POSTs here with the
 * fresh ID token; we verify it and call `setCustomUserClaims` so the user
 * gains the `beneficiary` role.
 *
 * Volunteer / businessOwner roles are assigned by admin tooling, NOT here.
 * Admin is bootstrapped via `scripts/setAdminClaim.ts`.
 */
import { FieldValue } from "firebase-admin/firestore";
import { Router, type Request, type Response } from "express";

import { auth as firebaseAuth, db } from "@/lib/firebaseAdmin";
import { authenticate } from "@/middleware/auth";

const router = Router();

/**
 * Ensure a `users/{uid}` profile doc exists (#63). Idempotent: a merge-set
 * only fills missing scalar fields on first call and refreshes `updatedAt`.
 * Failures here must not block role assignment, so callers log-and-continue.
 */
async function ensureUserProfile(
  uid: string,
  email: string | undefined,
  role: string,
): Promise<void> {
  const ref = db().collection("users").doc(uid);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    email: email ?? "",
    role,
    displayName: "",
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    age: null,
    gender: "",
    preferredLang: "he",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * POST /api/auth/register
 *
 * Caller must have just signed up via Firebase Auth (Email/Password). The
 * `authenticate` middleware verifies the ID token; we then promote the user
 * to `beneficiary`. Idempotent — calling again is harmless.
 *
 * Responses: 200 { ok, role, alreadyAssigned? } on success, 401
 * { error:"not_authenticated" }, 500 { error:"role_assignment_failed" }.
 */
router.post("/register", authenticate, async (req: Request, res: Response) => {
  // authenticate populates req.user from a verified token; bail if it didn't.
  if (!req.user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }

  try {
    // If this token already carries a privileged role, do not overwrite it.
    // Newly created self-signups usually arrive here without a role yet.
    if (req.user.role && req.user.role !== "beneficiary") {
      await ensureUserProfile(req.user.uid, req.user.email, req.user.role).catch(
        (err) => console.error("[auth/register] profile ensure failed:", err),
      );
      res.json({ ok: true, role: req.user.role, alreadyAssigned: true });
      return;
    }

    await firebaseAuth().setCustomUserClaims(req.user.uid, {
      role: "beneficiary",
    });
    await ensureUserProfile(req.user.uid, req.user.email, "beneficiary").catch(
      (err) => console.error("[auth/register] profile ensure failed:", err),
    );
    res.json({ ok: true, role: "beneficiary" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/register] failed:", err);
    res.status(500).json({ error: "role_assignment_failed" });
  }
});

export default router;
