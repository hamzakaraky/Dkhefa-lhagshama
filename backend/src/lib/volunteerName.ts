/**
 * Shared volunteer display-name resolution.
 *
 * Used by the volunteer self-service routes (claim/drop denormalize the name
 * into the request doc) and by the admin assign endpoint (denormalizes
 * `assignedVolunteerName` so the admin list never needs an N+1 lookup).
 */
import { db } from '@/lib/firebaseAdmin';

/** Best-effort display name for a volunteer doc, falling back to email/uid. */
export async function volunteerDisplayName(uid: string, email?: string): Promise<string> {
  try {
    const snap = await db().collection('volunteers').doc(uid).get();
    const data = snap.data() as { fullName?: string; name?: string } | undefined;
    return data?.fullName ?? data?.name ?? email ?? uid;
  } catch {
    return email ?? uid;
  }
}
