/**
 * requireVerifiedEmail middleware (#86).
 *
 * Express gate that blocks routes for accounts whose email is not yet verified
 * (e.g. beneficiary write-paths). Collaborates with the `authenticate`
 * middleware: must be composed AFTER it so `req.user` is populated, and it
 * re-decodes the same bearer token because `authenticate` only persists
 * uid/email/role onto `req.user`, not the `email_verified` claim we need here.
 *
 * Responses: 401 not_authenticated / missing_token / invalid_token,
 * 403 email_not_verified; on success calls next().
 *
 * Usage:
 *   router.post('/some-route', authenticate, requireVerifiedEmail, handler)
 */
import type { NextFunction, Request, Response } from 'express';

import { auth as firebaseAuth } from '@/lib/firebaseAdmin';

export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // defensive: should never hit if `authenticate` ran first, but guard anyway.
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const idToken = header.slice('Bearer '.length).trim();

  try {
    // second decode purely to read the email_verified claim (see header).
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'email_not_verified' });
      return;
    }
    next();
  } catch {
    // verifyIdToken threw (expired/revoked/malformed) -> treat as invalid.
    res.status(401).json({ error: 'invalid_token' });
  }
}
