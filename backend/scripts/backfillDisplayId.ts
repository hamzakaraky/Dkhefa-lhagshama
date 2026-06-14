/**
 * One-time backfill for WS-3 friendly request references.
 *
 * Numbers existing `requests` by `createdAt` ascending, writes a `displayId`
 * ("REQ-####") onto each doc that does not already have one, and advances the
 * `counters/requests.next` counter past the highest number used so new requests
 * continue the sequence without colliding.
 *
 * Idempotent: re-running skips docs that already carry a `displayId` and never
 * lowers the counter. Run by a human (like index/rules deploys):
 *   cd backend && npx tsx scripts/backfillDisplayId.ts
 */
import 'dotenv/config';
import { initializeFirebaseAdmin, db } from '../src/lib/firebaseAdmin';
import { formatDisplayId } from '../src/lib/displayId';

initializeFirebaseAdmin();

async function main(): Promise<void> {
  const snap = await db().collection('requests').get();

  // Order by createdAt ascending so the oldest request becomes REQ-0001.
  const docs = snap.docs
    .map((d) => ({
      ref: d.ref,
      id: d.id,
      hasDisplayId:
        typeof (d.data() as { displayId?: unknown }).displayId === 'string' &&
        ((d.data() as { displayId?: string }).displayId ?? '').length > 0,
      createdMs: (d.data().createdAt as { toDate?: () => Date } | undefined)?.toDate?.()?.getTime?.() ?? 0,
    }))
    .sort((a, b) => a.createdMs - b.createdMs);

  // Start the sequence at the current counter value (so a partial prior run is
  // not overwritten), but never below 1.
  const counterRef = db().collection('counters').doc('requests');
  const counterSnap = await counterRef.get();
  const existingNext = counterSnap.exists
    ? Number((counterSnap.data() as { next?: unknown }).next)
    : 0;
  let next = Number.isFinite(existingNext) && existingNext > 0 ? existingNext : 1;

  let assigned = 0;
  let batch = db().batch();
  let ops = 0;

  for (const doc of docs) {
    if (doc.hasDisplayId) continue;
    const displayId = formatDisplayId(next);
    batch.update(doc.ref, { displayId });
    next += 1;
    assigned += 1;
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  // Advance the counter to the next free number (never lower it).
  await counterRef.set({ next: Math.max(next, existingNext) }, { merge: true });

  // eslint-disable-next-line no-console
  console.log(`Backfill done: ${assigned} request(s) assigned a displayId; counter next=${Math.max(next, existingNext)}.`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('backfillDisplayId failed:', err);
  process.exit(1);
});
