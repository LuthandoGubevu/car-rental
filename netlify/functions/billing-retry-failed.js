import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { paystackFetch } from './_lib/paystack.js';

// Scheduled: daily. Picks up both invoices Paystack told us failed, and
// invoices stuck pending because the charge_authorization call itself
// never reached Paystack (network error) - either way, nothing has heard
// back after a full day, so it's safe to try again.
export const config = { schedule: '0 8 * * *' };

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default async () => {
  const db = getAdminDb();
  const retriableSnap = await db.collection('invoices').where('status', 'in', ['failed', 'pending']).get();

  for (const invoiceDoc of retriableSnap.docs) {
    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };
    if (invoice.attempts >= invoice.maxAttempts) continue;

    const lastAttempt = invoice.lastAttemptAt?.toDate ? invoice.lastAttemptAt.toDate() : new Date(invoice.lastAttemptAt);
    if (Date.now() - lastAttempt.getTime() < COOLDOWN_MS) continue;

    const companySnap = await db.collection('companies').doc(invoice.companyId).get();
    if (!companySnap.exists) continue;
    const company = companySnap.data();
    if (!company.paystackAuthorizationCode) continue;

    const nextAttempt = invoice.attempts + 1;
    const nextReference = `INV-${invoice.id}-${nextAttempt}`;
    await invoiceDoc.ref.update({
      attempts: nextAttempt,
      status: 'pending',
      paystackReference: nextReference,
      paystackAuthorizationCode: company.paystackAuthorizationCode,
      lastAttemptAt: FieldValue.serverTimestamp(),
    });

    try {
      await paystackFetch('/transaction/charge_authorization', {
        method: 'POST',
        body: {
          authorization_code: company.paystackAuthorizationCode,
          email: company.paystackAuthorizationEmail || company.contactEmail,
          amount: invoice.amountInCents,
          currency: 'ZAR',
          reference: nextReference,
          metadata: { companyId: invoice.companyId, invoiceId: invoice.id },
        },
      });
    } catch (err) {
      console.error(`Could not initiate retry charge for invoice ${invoice.id}:`, err);
    }
  }

  return new Response('ok', { status: 200 });
};
