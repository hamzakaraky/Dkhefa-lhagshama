/**
 * Full Firestore backup → JSON. Read-only and safe.
 *
 * Dumps every collection used by the platform to a single timestamped file
 * under scripts/data/, with Firestore Timestamps converted to ISO strings and
 * doc ids preserved as keys. This is the restore point taken automatically by
 * seedDemoData.ts before it wipes anything; it can also be run standalone:
 *
 *   cd backend && npx tsx scripts/exportFirestore.ts
 *
 * Returns (when imported) the path of the file it wrote.
 */
import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { initializeFirebaseAdmin, db } from '../src/lib/firebaseAdmin';

export const BACKUP_COLLECTIONS = [
  'requests',
  'chats',
  'messages',
  'ratings',
  'requestEvents',
  'volunteerApplications',
  'auditLogs',
  'users',
  'volunteers',
  'answers',
  'businesses',
  'categories',
  'counters',
] as const;

/** Recursively convert Firestore Timestamps (and nested ones) to ISO strings. */
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  // Firestore Timestamp duck-type
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out;
  }
  return value;
}

export async function exportFirestore(): Promise<string> {
  const dump: Record<string, Record<string, unknown>> = {};
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await db().collection(name).get();
    const docs: Record<string, unknown> = {};
    snap.forEach((d) => {
      docs[d.id] = serialize(d.data());
    });
    dump[name] = docs;
    // eslint-disable-next-line no-console
    console.log(`  exported ${name}: ${snap.size} doc(s)`);
  }

  const dir = path.join(__dirname, 'data');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `backup-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(dump, null, 2), 'utf8');
  return file;
}

// Run directly (not when imported by the seed script).
if (require.main === module) {
  initializeFirebaseAdmin();
  exportFirestore()
    .then((file) => {
      // eslint-disable-next-line no-console
      console.log(`\nBackup written: ${file}`);
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('exportFirestore failed:', err);
      process.exit(1);
    });
}
