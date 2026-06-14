/**
 * Friendly request reference (WS-3).
 *
 * The durable key stays the v4 UUID (Firestore doc id / Storage prefix /
 * deep-link key). `displayId` is a short, human-memorable PARALLEL field
 * ("REQ-0042") allocated server-side from a Firestore counter transaction —
 * see allocateNextRequestNumber() in routes/requests.ts.
 *
 * This module holds ONLY the pure formatting so it can be unit-tested without
 * Firestore.
 */

/** The fixed prefix shown to users. */
export const REQUEST_REF_PREFIX = 'REQ-' as const;

/** Minimum zero-padding width (numbers wider than this are not truncated). */
const PAD_WIDTH = 4;

/**
 * Format a 1-based counter integer as a friendly reference, e.g. 42 -> "REQ-0042".
 * Throws on non-positive / non-integer input so a bad counter value fails loudly
 * rather than minting a malformed reference.
 */
export function formatDisplayId(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`formatDisplayId: expected a positive integer, got ${n}`);
  }
  return `${REQUEST_REF_PREFIX}${String(n).padStart(PAD_WIDTH, '0')}`;
}
