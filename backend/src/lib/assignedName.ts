/**
 * Decide whether a denormalized assigned-volunteer name on a request doc is
 * usable for display, or whether it must be re-resolved live (WS-5).
 *
 * A stored `assignedVolunteerName` is unusable when it is:
 *   - missing (null / undefined),
 *   - empty or whitespace-only, or
 *   - byte-equal to the volunteer's uid (a legacy row that stored the raw uid
 *     in the name slot — the exact bug this fix removes).
 *
 * Pure + dependency-free so the admin-list row projection can call it without a
 * Firestore round-trip, and so it can be unit-tested in isolation.
 */
// returns true when the stored name cannot be shown as-is and must be re-resolved
// from the volunteer record live. callers (admin-list projection, backfill) use this
// as the single gate so the "is this name a real name" rule lives in one place.
export function needsNameResolution(
  name: string | null | undefined,
  uid: string | null | undefined,
): boolean {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return true;
  // legacy rows stored the raw uid in the name slot; treat name===uid as unresolved
  if (uid && trimmed === uid.trim()) return true;
  return false;
}
