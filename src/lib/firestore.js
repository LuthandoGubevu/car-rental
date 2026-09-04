import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export function genRef(prefix) {
  const now = new Date();
  const stamp = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${stamp}-${rand}`;
}

// --- Vehicles ---

export async function listVehicles(companyId) {
  const snap = await getDocs(
    query(collection(db, 'vehicles'), where('companyId', '==', companyId), orderBy('reg'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Staff-only: every vehicle across every company, for business-wide metrics
// on the internal console. Regular admin/driver reads always go through
// listVehicles(companyId) / getVehicleForDriver above.
export async function listAllVehicles() {
  const snap = await getDocs(collection(db, 'vehicles'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getVehicleForDriver(uid) {
  const snap = await getDocs(query(collection(db, 'vehicles'), where('driverUid', '==', uid), limit(1)));
  const d = snap.docs[0];
  return d ? { id: d.id, ...d.data() } : null;
}

export async function addVehicle(data) {
  return addDoc(collection(db, 'vehicles'), {
    ...data,
    status: data.status || 'Available',
    condition: data.condition || 'Not yet assessed',
    createdAt: serverTimestamp(),
  });
}

export async function updateVehicle(id, data) {
  return updateDoc(doc(db, 'vehicles', id), data);
}

// Bulk onboarding import - same shape/defaults as addVehicle, chunked into
// batches of 400 (Firestore's write-batch limit is 500) so a fleet's worth
// of vehicles can be created in a handful of round trips instead of one
// write per row.
export async function bulkAddVehicles(rows, companyId) {
  const ids = [];
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const batch = writeBatch(db);
    const refs = chunk.map(() => doc(collection(db, 'vehicles')));
    chunk.forEach((data, idx) => {
      batch.set(refs[idx], {
        ...data,
        companyId,
        status: data.status || 'Available',
        condition: data.condition || 'Not yet assessed',
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    ids.push(...refs.map((r) => r.id));
  }
  return ids;
}

export async function findUserByEmail(email, companyId) {
  const snap = await getDocs(
    query(collection(db, 'users'), where('companyId', '==', companyId), where('email', '==', email), limit(1))
  );
  const d = snap.docs[0];
  return d ? { uid: d.id, ...d.data() } : null;
}

export async function listCompanyUsers(companyId) {
  const snap = await getDocs(query(collection(db, 'users'), where('companyId', '==', companyId)));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function setUserRole(uid, role) {
  return updateDoc(doc(db, 'users', uid), { role });
}

// --- Submissions (vehicle condition checks) ---

const ANGLES = ['front', 'left', 'rear', 'right'];

// Photos come in as data URLs (device camera capture) or Files; either way
// they're uploaded before the submission doc is written, so the Firestore
// record only ever holds public download URLs, never raw photo bytes.
export async function uploadSubmissionPhotos(uid, photos) {
  const stamp = Date.now();
  const urls = {};
  for (const angle of ANGLES) {
    const file = photos[angle];
    if (!file) continue;
    const path = `submissions/${uid}/${stamp}/${angle}.jpg`;
    const ref = storageRef(storage, path);
    const blob = typeof file === 'string' ? await (await fetch(file)).blob() : file;
    await uploadBytes(ref, blob, { contentType: blob.type || 'image/jpeg' });
    urls[angle] = await getDownloadURL(ref);
  }
  return urls;
}

export async function createSubmission({ uid, companyId, driverName, vehicle, photos, damage }) {
  const ref = genRef('VCC');
  const docRef = await addDoc(collection(db, 'submissions'), {
    ref,
    driverUid: uid,
    companyId,
    customer: driverName,
    vehicleId: vehicle.id,
    vehicle: [vehicle.make, vehicle.model].filter(Boolean).join(' '),
    reg: vehicle.reg,
    branch: vehicle.branch || '',
    photos,
    damage: damage || null,
    status: 'Awaiting Review',
    createdAt: serverTimestamp(),
  });
  // Best-effort: the submission itself is already saved by this point, so a
  // failure bumping the vehicle's "last inspected" stamp shouldn't make a
  // successful submission look like it failed to the driver.
  try {
    await updateDoc(doc(db, 'vehicles', vehicle.id), { lastInspectionAt: serverTimestamp() });
  } catch (err) {
    console.error('Could not update vehicle lastInspectionAt after submission:', err);
  }
  return { id: docRef.id, ref };
}

export async function listSubmissionsForDriver(uid) {
  const snap = await getDocs(
    query(collection(db, 'submissions'), where('driverUid', '==', uid), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLatestSubmissionForDriver(uid) {
  const snap = await getDocs(
    query(collection(db, 'submissions'), where('driverUid', '==', uid), orderBy('createdAt', 'desc'), limit(1))
  );
  const d = snap.docs[0];
  return d ? { id: d.id, ...d.data() } : null;
}

export async function listSubmissions(status, companyId) {
  const clauses = [where('companyId', '==', companyId)];
  if (status) clauses.push(where('status', '==', status));
  const snap = await getDocs(query(collection(db, 'submissions'), ...clauses, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getSubmission(id) {
  const snap = await getDoc(doc(db, 'submissions', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function recordVerdict(id, { verdict, reviewedBy, reviewedByUid, declineReasons, declineNotes }) {
  const status = verdict === 'approved' ? 'Reviewed' : 'Declined';
  return updateDoc(doc(db, 'submissions', id), {
    status,
    verdict,
    reviewedBy,
    reviewedByUid,
    reviewedAt: serverTimestamp(),
    declineReasons: verdict === 'declined' ? declineReasons || [] : null,
    declineNotes: verdict === 'declined' ? declineNotes || '' : null,
  });
}

// Light action for a client admin: acknowledges a flagged submission
// without changing its verdict - a "seen it" signal, distinct from staff's
// actual review.
export async function acknowledgeSubmission(id, adminName, adminUid) {
  return updateDoc(doc(db, 'submissions', id), {
    acknowledgedByAdmin: true,
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: adminName,
    acknowledgedByUid: adminUid,
  });
}

// --- User preferences ---

export async function updateNotificationPrefs(uid, prefs) {
  return updateDoc(doc(db, 'users', uid), { notifyEmail: prefs.notifyEmail, notifySms: prefs.notifySms });
}

// --- Incidents ---

export async function createIncident({ uid, companyId, driverName, vehicle, type, description, date }) {
  const ref = genRef('INC');
  const docRef = await addDoc(collection(db, 'incidents'), {
    ref,
    driverUid: uid,
    companyId,
    customer: driverName,
    vehicleId: vehicle?.id || null,
    vehicle: vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(' ') : '',
    reg: vehicle?.reg || '',
    type,
    description,
    date,
    status: 'Logged',
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ref };
}

export async function listIncidentsForDriver(uid) {
  const snap = await getDocs(
    query(collection(db, 'incidents'), where('driverUid', '==', uid), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listIncidents(companyId) {
  const snap = await getDocs(
    query(collection(db, 'incidents'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markIncidentReviewed(id, reviewedBy, reviewedByUid) {
  return updateDoc(doc(db, 'incidents', id), {
    status: 'Reviewed',
    reviewedBy,
    reviewedByUid,
    reviewedAt: serverTimestamp(),
  });
}

// Light action for a client admin: acknowledges an open incident without
// resolving it - a "seen it" signal, distinct from staff's actual review.
export async function acknowledgeIncident(id, adminName, adminUid) {
  return updateDoc(doc(db, 'incidents', id), {
    acknowledgedByAdmin: true,
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: adminName,
    acknowledgedByUid: adminUid,
  });
}

// --- Demo requests (staff-only; see firestore.rules) ---
// Submitted from the public landing page by visitors who are never signed
// in, so this is the one write path in the app with no auth requirement at
// all - see the "New" status: it's set client-side but pinned by the rules
// so a request can't arrive pre-marked as handled.

export async function createDemoRequest({ name, company, email, phone, fleetSize, branches, message }) {
  return addDoc(collection(db, 'demoRequests'), {
    name,
    company,
    email,
    phone: phone || '',
    fleetSize: fleetSize || '',
    branches: branches || '',
    message: message || '',
    status: 'New',
    createdAt: serverTimestamp(),
  });
}

export async function listDemoRequests() {
  const snap = await getDocs(query(collection(db, 'demoRequests'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markDemoRequestContacted(id, contactedBy) {
  return updateDoc(doc(db, 'demoRequests', id), {
    status: 'Contacted',
    contactedBy,
    contactedAt: serverTimestamp(),
  });
}

// --- Companies (staff-only management; see firestore.rules) ---

export async function listCompanies() {
  const snap = await getDocs(query(collection(db, 'companies'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCompany({ name, tier, branches, contactName, contactEmail, contactPhone, address }, staffUid) {
  const docRef = await addDoc(collection(db, 'companies'), {
    name,
    status: 'trial',
    tier: tier || '',
    branches: branches || [],
    contactName: contactName || '',
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    address: address || '',
    primaryAdminUid: null,
    createdAt: serverTimestamp(),
    createdBy: staffUid,
  });
  return docRef;
}

export async function getCompany(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateCompany(companyId, data) {
  return updateDoc(doc(db, 'companies', companyId), data);
}

// --- Invites: the single provisioning mechanism for a company's first
// admin (created by staff) and for a company's drivers (created by that
// company's own admin). See firestore.rules for how a client cannot
// self-assign a role/companyId without a matching pending invite. ---

export async function createInvite({ role, companyId, companyName, email }, createdByUid) {
  const docRef = await addDoc(collection(db, 'invites'), {
    role,
    companyId,
    companyName,
    email: email.trim().toLowerCase(),
    status: 'pending',
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    acceptedBy: null,
    acceptedAt: null,
  });
  return docRef.id;
}

// Bulk onboarding: same shape as createInvite, chunked into batches of 400
// (Firestore's write-batch limit is 500). Returns each row's new invite id
// alongside its name/email so the caller can build/share the accept links.
export async function bulkCreateInvites(rows, { role, companyId, companyName }, createdByUid) {
  const results = [];
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const batch = writeBatch(db);
    const refs = chunk.map(() => doc(collection(db, 'invites')));
    chunk.forEach((row, idx) => {
      batch.set(refs[idx], {
        role,
        companyId,
        companyName,
        email: row.email.trim().toLowerCase(),
        status: 'pending',
        createdBy: createdByUid,
        createdAt: serverTimestamp(),
        acceptedBy: null,
        acceptedAt: null,
      });
    });
    await batch.commit();
    results.push(...chunk.map((row, idx) => ({ id: refs[idx].id, name: row.name, email: row.email })));
  }
  return results;
}

export async function getInvite(inviteId) {
  const snap = await getDoc(doc(db, 'invites', inviteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listCompanyInvites(companyId) {
  const snap = await getDocs(query(collection(db, 'invites'), where('companyId', '==', companyId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function revokeInvite(inviteId) {
  return updateDoc(doc(db, 'invites', inviteId), { status: 'revoked' });
}

// Runs the two writes (create the user profile, mark the invite accepted)
// as one atomic transaction - either both succeed or neither does, so an
// invite can never be left half-consumed.
export async function acceptInviteTransaction(inviteId, uid, profileFields) {
  await runTransaction(db, async (tx) => {
    const inviteRef = doc(db, 'invites', inviteId);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists() || inviteSnap.data().status !== 'pending') {
      throw new Error('This invite has already been used.');
    }
    const invite = inviteSnap.data();
    tx.set(doc(db, 'users', uid), {
      ...profileFields,
      role: invite.role,
      companyId: invite.companyId,
      email: invite.email,
      inviteId,
      invitedBy: invite.createdBy,
      createdAt: serverTimestamp(),
    });
    tx.update(inviteRef, { status: 'accepted', acceptedBy: uid, acceptedAt: serverTimestamp() });
  });
}
