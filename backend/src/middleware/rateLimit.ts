/**
 * Rate limiting middleware (#82).
 *
 * Two limiters:
 *  - `globalLimiter`  — applied to every request: 300 req / 15 min per IP.
 *  - `authWriteLimiter` — stricter, for auth endpoints and mutating routes:
 *                          30 req / 15 min per IP.
 *
 * Consumed in app setup (app.ts): globalLimiter is mounted app-wide and
 * authWriteLimiter is layered on the auth + mutating route groups.
 *
 * Both use the default in-memory store which is fine for a single-process
 * deployment. Swap to RedisStore when we move to multi-instance Cloud Run.
 *
 * `validate.trustProxy: false` disables express-rate-limit's permissive-trust-
 * proxy guard. In production the app runs behind Firebase Hosting + Cloud
 * Functions, where `app.set('trust proxy', true)` is required so req.ip is the
 * real client (Google manages X-Forwarded-For). The guard would otherwise log
 * ERR_ERL_PERMISSIVE_TRUST_PROXY on every request; we trust Google's proxy.
 */
import rateLimit from 'express-rate-limit';

/** Applied globally — coarse protection against bulk scanning. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', retryAfter: '15 minutes' },
  validate: { trustProxy: false },
});

/**
 * Applied to auth endpoints and write routes — stricter.
 *
 * Mutating verbs only: the mounts this guards (/api/chats, /api/requests, ...)
 * also serve per-page GET fan-outs (chat list resolves one request status +
 * one participants list per chat), and counting those reads against the same
 * 30-request budget locked out message sending after a few minutes of normal
 * browsing. Reads stay covered by the 300 req/15 min globalLimiter.
 */
export const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', retryAfter: '15 minutes' },
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  validate: { trustProxy: false },
});
