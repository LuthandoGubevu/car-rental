// One-off migration: backfills the multi-tenant data model onto the single
// existing live company. This uses the Firebase Admin SDK, which bypasses
// Firestore Security Rules entirely - it must be run locally by a human with
// access to a service-account key, NOT deployed anywhere.
//
// Prerequisites:
//   1. npm install --no-save firebase-admin
//   2. Firebase Console -> Project Settings -> Service Accounts ->
//      "Generate new private key" -> save the JSON somewhere outside git.
//   3. Rehearse this script against the Firestore emulator or a throwaway
//      project first. Never run an unrehearsed migration against production.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//   COMPANY_NAME="Your Existing Customer's Company Name" \
//   STAFF_EMAIL="lgubevu@gmail.com" \
//   STAFF_PASSWORD="a-strong-temporary-password" \
//   node scripts/migrate-multitenant.mjs
//
// Safe to re-run: every step is idempotent (it always sets the same fixed
// values rather than branching on prior state), so an interrupted run can
// simply be started again.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const COMPANY_NAME = process.env.COMPANY_NAME;
const STAFF_EMAIL = process.env.STAFF_EMAIL;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

if (!COMPANY_NAME || !STAFF_EMAIL || !STAFF_PASSWORD) {
  console.error('Set COMPANY_NAME, STAFF_EMAIL and STAFF_PASSWORD environment variables before running this script.');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const auth = getAuth();

const COMPANY_ID = 'company-1'; // fixed, deliberate - makes every step below idempotent

async function backfillCollection(name, extraFields = {}) {
  const snap = await db.collection(name).get();
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.update(doc.ref, { companyId: COMPANY_ID, ...extraFields });
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  ${name}: backfilled ${count} document(s).`);
}

async function main() {
  console.log(`Step 1: creating/updating companies/${COMPANY_ID}`);
  await db.collection('companies').doc(COMPANY_ID).set(
    {
      name: COMPANY_NAME,
      status: 'active',
      tier: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      branches: [],
      primaryAdminUid: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'migration-script',
    },
    { merge: true }
  );

  console.log(`Step 2: provisioning the first staff account for ${STAFF_EMAIL}`);
  let staffUser;
  try {
    staffUser = await auth.getUserByEmail(STAFF_EMAIL);
    console.log('  Auth account already exists, reusing it.');
  } catch {
    staffUser = await auth.createUser({ email: STAFF_EMAIL, password: STAFF_PASSWORD });
    console.log('  Created new Auth account.');
  }
  await db.collection('users').doc(staffUser.uid).set(
    {
      role: 'staff',
      companyId: null,
      email: STAFF_EMAIL,
      name: 'Car Care Staff',
      inviteId: null,
      invitedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'migration-script',
    },
    { merge: true }
  );

  console.log('Step 3: backfilling companyId onto existing documents');
  // users: every existing account belongs to the one real tenant except the
  // staff account just created above, which must never get a companyId. The
  // app only ever understands role 'admin' | 'driver' | 'staff' - the old
  // pre-multi-tenant role value was 'customer', so that gets renamed to
  // 'driver' here too (existing 'admin' docs are left as 'admin').
  const usersSnap = await db.collection('users').get();
  let batch = db.batch();
  let userCount = 0;
  for (const doc of usersSnap.docs) {
    if (doc.id === staffUser.uid) continue;
    const data = doc.data();
    const update = { companyId: COMPANY_ID };
    if (data.role === 'customer') update.role = 'driver';
    batch.update(doc.ref, update);
    userCount += 1;
    if (userCount % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  users: backfilled ${userCount} document(s) (staff account skipped).`);

  await backfillCollection('vehicles');
  await backfillCollection('submissions');
  await backfillCollection('incidents');

  console.log('\nDone. Next steps (see the implementation plan for full detail):');
  console.log('  1. Deploy firestore.indexes.json and wait for every index to show "Enabled".');
  console.log('  2. Verify zero documents are missing companyId (spot-check in the console).');
  console.log('  3. Deploy firestore.rules and storage.rules.');
  console.log('  4. Ship the new frontend build.');
  console.log('  5. Smoke test: existing admin still sees their data; staff login works; run one real invite end-to-end.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
