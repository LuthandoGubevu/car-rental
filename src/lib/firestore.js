import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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

export async function listVehicles() {
  const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('reg')));
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

export async function findUserByEmail(email) {
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email), limit(1)));
  const d = snap.docs[0];
  return d ? { uid: d.id, ...d.data() } : null;
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

export async function createSubmission({ uid, driverName, vehicle, photos, damage }) {
  const ref = genRef('VCC');
  const docRef = await addDoc(collection(db, 'submissions'), {
    ref,
    driverUid: uid,
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

export async function listSubmissions(status) {
  const clauses = status ? [where('status', '==', status)] : [];
  const snap = await getDocs(query(collection(db, 'submissions'), ...clauses, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getSubmission(id) {
  const snap = await getDoc(doc(db, 'submissions', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function recordVerdict(id, { verdict, reviewedBy, declineReasons, declineNotes }) {
  const status = verdict === 'approved' ? 'Reviewed' : 'Declined';
  return updateDoc(doc(db, 'submissions', id), {
    status,
    verdict,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    declineReasons: verdict === 'declined' ? declineReasons || [] : null,
    declineNotes: verdict === 'declined' ? declineNotes || '' : null,
  });
}

// --- User preferences ---

export async function updateNotificationPrefs(uid, prefs) {
  return updateDoc(doc(db, 'users', uid), { notifyEmail: prefs.notifyEmail, notifySms: prefs.notifySms });
}

// --- Incidents ---

export async function createIncident({ uid, driverName, vehicle, type, description, date }) {
  const ref = genRef('INC');
  return addDoc(collection(db, 'incidents'), {
    ref,
    driverUid: uid,
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
}

export async function listIncidentsForDriver(uid) {
  const snap = await getDocs(
    query(collection(db, 'incidents'), where('driverUid', '==', uid), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listIncidents() {
  const snap = await getDocs(query(collection(db, 'incidents'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markIncidentReviewed(id, reviewedBy) {
  return updateDoc(doc(db, 'incidents', id), {
    status: 'Reviewed',
    reviewedBy,
    reviewedAt: serverTimestamp(),
  });
}

// --- Demo requests ---
// Submitted from the public landing page by visitors who are never signed
// in, so this is the one write path in the app with no auth requirement at
// all - see the "New" status: it's set client-side but pinned by the rules
// so a request can't arrive pre-marked as handled.

export async function createDemoRequest({ name, company, email, phone, fleetSize, message }) {
  return addDoc(collection(db, 'demoRequests'), {
    name,
    company,
    email,
    phone: phone || '',
    fleetSize: fleetSize || '',
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
