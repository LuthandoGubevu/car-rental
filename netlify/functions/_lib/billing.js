import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin.js';
import { FLAT_RATE_PER_VEHICLE, billableVehicles } from './pricing.js';

function periodKeyFor(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function findExistingInvoice(companyId, periodKey) {
  const db = getAdminDb();
  const snap = await db
    .collection('invoices')
    .where('companyId', '==', companyId)
    .where('periodKey', '==', periodKey)
    .limit(1)
    .get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// Creates the invoice for the current period if one doesn't already exist -
// callers always go through this rather than db.collection('invoices').add()
// directly, so the periodKey guard against double billing can't be skipped.
export async function createPendingInvoice({ company, vehicles, attempt = 1 }) {
  const db = getAdminDb();
  const periodKey = periodKeyFor(new Date());
  const vehicleCount = billableVehicles(vehicles).length;
  const amount = vehicleCount * FLAT_RATE_PER_VEHICLE;
  const ref = db.collection('invoices').doc();
  const paystackReference = `INV-${ref.id}-${attempt}`;
  const invoice = {
    companyId: company.id,
    companyName: company.name,
    periodKey,
    vehicleCount,
    rate: FLAT_RATE_PER_VEHICLE,
    amount,
    amountInCents: Math.round(amount * 100),
    status: 'pending',
    attempts: attempt,
    maxAttempts: 3,
    paystackAuthorizationCode: company.paystackAuthorizationCode || null,
    paystackReference,
    paystackTransactionId: null,
    lastAttemptAt: FieldValue.serverTimestamp(),
    attemptHistory: [],
    failureReason: null,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: null,
  };
  await ref.set(invoice);
  return { id: ref.id, ...invoice };
}

// Idempotent by paystackReference - a duplicate webhook delivery for a
// reference that's already marked paid is a safe no-op.
export async function recordSuccessfulCharge(reference, paystackData) {
  const db = getAdminDb();
  const snap = await db.collection('invoices').where('paystackReference', '==', reference).limit(1).get();
  if (snap.empty) return null;
  const invoiceRef = snap.docs[0].ref;
  const invoice = snap.docs[0].data();
  if (invoice.status === 'paid') return invoice;

  await invoiceRef.update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
    paystackTransactionId: paystackData.id || null,
    attemptHistory: FieldValue.arrayUnion({
      reference,
      attemptedAt: new Date().toISOString(),
      status: 'success',
      gatewayResponse: paystackData.gateway_response || '',
    }),
  });
  if (invoice.companyId) {
    await db.collection('companies').doc(invoice.companyId).update({ billingStatus: 'active' });
  }
  return invoice;
}

// Idempotent by paystackReference. Only flips the company to past_due once
// this invoice has exhausted its attempts - the scheduled retry job owns
// incrementing attempts, this function only ever records an outcome.
export async function recordFailedCharge(reference, paystackData) {
  const db = getAdminDb();
  const snap = await db.collection('invoices').where('paystackReference', '==', reference).limit(1).get();
  if (snap.empty) return null;
  const invoiceRef = snap.docs[0].ref;
  const invoice = snap.docs[0].data();
  if (invoice.status === 'failed_final') return invoice;

  const failureReason = paystackData.gateway_response || 'Charge failed';
  const exhausted = invoice.attempts >= invoice.maxAttempts;
  await invoiceRef.update({
    status: exhausted ? 'failed_final' : 'failed',
    failureReason,
    attemptHistory: FieldValue.arrayUnion({
      reference,
      attemptedAt: new Date().toISOString(),
      status: 'failed',
      gatewayResponse: failureReason,
    }),
  });
  if (exhausted && invoice.companyId) {
    await db.collection('companies').doc(invoice.companyId).update({ billingStatus: 'past_due' });
  }
  return invoice;
}
