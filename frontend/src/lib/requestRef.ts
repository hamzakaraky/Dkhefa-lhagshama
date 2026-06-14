/**
 * Friendly request reference renderer (WS-3).
 *
 * Every user-facing surface that used to print the raw 36-char UUID now calls
 * this. Prefer the server-allocated `displayId` ("REQ-0042"); fall back to a
 * short, recognizable slice of the UUID for any doc that predates the field and
 * has not been backfilled yet (never the full UUID).
 */

/** Short fallback for a request that has no displayId yet: first 8 UUID chars. */
export function shortFallback(uuid: string | null | undefined): string {
  const s = String(uuid ?? '').trim();
  if (!s) return '';
  return s.slice(0, 8);
}

/**
 * Render the reference for a request-like object. Accepts either the full id or
 * a `{ displayId, id }` shape so call sites can pass whichever they hold.
 */
export function formatRequestRef(
  req: { displayId?: string | null; id?: string | null } | null | undefined,
): string {
  if (!req) return '';
  const did = typeof req.displayId === 'string' ? req.displayId.trim() : '';
  if (did) return did;
  return shortFallback(req.id);
}
