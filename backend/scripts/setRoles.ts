/**
 * Bulk-assign roles in one command.
 *
 * Usage:
 *   cd backend
 *   npm run set-roles -- admin@example.com:admin volunteer@example.com:volunteer
 *
 * Each argument is `<email>:<role>` where role ∈ beneficiary | businessOwner | volunteer | admin.
 * Users must already exist in Firebase Auth. Each user must sign out + sign in
 * again to see their new role.
 */
import 'dotenv/config';

import { initializeFirebaseAdmin, auth } from '@/lib/firebaseAdmin';

const VALID_ROLES = ['beneficiary', 'businessOwner', 'volunteer', 'admin'] as const;
type Role = (typeof VALID_ROLES)[number];

function isRole(value: string): value is Role {
  return (VALID_ROLES as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npm run set-roles -- <email>:<role> [<email>:<role> ...]');
    console.error(`Roles: ${VALID_ROLES.join(' | ')}`);
    process.exit(1);
  }

  const pairs: Array<{ email: string; role: Role }> = [];
  for (const arg of args) {
    const idx = arg.lastIndexOf(':');
    if (idx === -1) {
      console.error(`Bad argument "${arg}" — expected <email>:<role>.`);
      process.exit(1);
    }
    const email = arg.slice(0, idx);
    const role = arg.slice(idx + 1);
    if (!email || !isRole(role)) {
      console.error(`Bad argument "${arg}" — role must be one of ${VALID_ROLES.join(', ')}.`);
      process.exit(1);
    }
    pairs.push({ email, role });
  }

  initializeFirebaseAdmin();

  let failures = 0;
  for (const { email, role } of pairs) {
    try {
      const user = await auth().getUserByEmail(email);
      await auth().setCustomUserClaims(user.uid, { role });
      console.log(`OK  ${email} → ${role}`);
    } catch (err) {
      failures += 1;
      console.error(`FAIL ${email} → ${role}:`, (err as Error).message);
    }
  }

  console.log('NOTE: each user must sign out + sign in again to see the new role.');
  process.exit(failures === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error('set-roles failed:', err);
  process.exit(3);
});
