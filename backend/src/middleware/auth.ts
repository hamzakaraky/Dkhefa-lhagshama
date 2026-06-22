/**
 * Express auth middleware for the API. The single trust boundary between
 * incoming HTTP requests and the Admin-SDK routes.
 *
 * `authenticate` verifies the Firebase ID token in `Authorization: Bearer <token>`
 * and attaches `req.user = { uid, email, role }` for downstream handlers; 401 otherwise.
 * `requireRole` / `requireAnyRole` then gate handlers by the role custom claim.
 *
 * Trust model: `role` comes from a server-set Firebase custom claim
 * (request.auth.token.role in {beneficiary|businessOwner|volunteer|admin}), so it is
 * trustworthy once the token is verified and is never taken from the request body.
 * Note the two gates differ on admin: `requireRole` is an exact match (admin is NOT a
 * superset), `requireAnyRole` always lets admin through.
 */
import type { NextFunction, Request, Response } from 'express';

import { auth as firebaseAuth } from '@/lib/firebaseAdmin';

export type Role = 'beneficiary' | 'businessOwner' | 'volunteer' | 'admin';

export interface AuthedUser {
  uid: string;
  email?: string;
  role?: Role;
}

// augment Express.Request so handlers can read `req.user` with types after authenticate runs
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

// verifies the Bearer ID token, sets req.user, then next(); 401 {error} on missing/invalid token
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const idToken = header.slice('Bearer '.length).trim();

  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      // role is a server-set custom claim; absent for users without an assigned role
      role: (decoded.role as Role | undefined) ?? undefined,
    };
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] token verification failed:', err);
    res.status(401).json({ error: 'invalid_token' });
  }
}

// gate allowing exactly `role` (no admin override); 401 if unauthenticated, 403 {required} on mismatch
export function requireRole(role: Role) {
  return function roleGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.user) {
      res.status(401).json({ error: 'not_authenticated' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'forbidden', required: role });
      return;
    }
    next();
  };
}

/**
 * Gate for endpoints that any of the given roles may use. `admin` is always
 * treated as a superset and is allowed through every `requireAnyRole` gate, so
 * callers only need to list the non-admin roles (e.g. `requireAnyRole('volunteer')`
 * lets volunteers AND admins in — matching the frontend `hasRole` superset rule).
 */
export function requireAnyRole(...roles: Role[]) {
  const allowed = new Set<Role>([...roles, 'admin']); // admin folded in as the implicit superset
  return function anyRoleGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.user) {
      res.status(401).json({ error: 'not_authenticated' });
      return;
    }
    if (!req.user.role || !allowed.has(req.user.role)) {
      res.status(403).json({ error: 'forbidden', required: roles });
      return;
    }
    next();
  };
}
