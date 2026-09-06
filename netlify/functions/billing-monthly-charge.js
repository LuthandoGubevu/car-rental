import { getAdminDb } from './_lib/firebaseAdmin.js';
import { paystackFetch } from './_lib/paystack.js';
import { createPendingInvoice, findExistingInvoice } from './_lib/billing.js';
import { billableVehicles } from './_lib/pricing.js';

// Scheduled: 06:00 UTC on the 1st of each month.
export const config = { schedule: '0 6 1 * *' };

export default async () => {
  const db = getAdminDb();
  const companiesSnap = await db.collection('companies').where('status', '==', 'active').get();
  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const companyDoc of companiesSnap.docs) {
    const company = { id: companyDoc.id, ...companyDoc.data() };
    if (!company.paystackAuthorizationCode) continue;

    const existing = await findExistingInvoice(company.id, periodKey);
    if (existing) continue;

    const vehiclesSnap = await db.collection('vehicles').where('companyId', '==', company.id).get();
    const vehicles = vehiclesSnap.docs.map((d) => d.data());
    if (billableVehicles(vehicles).length === 0) continue;

    const invoice = await createPendingInvoice({ company, vehicles });

    try {
      await paystackFetch('/transaction/charge_authorization', {
        method: 'POST',
        body: {
          authorization_code: company.paystackAuthorizationCode,
          email: company.paystackAuthorizationEmail || company.contactEmail,
          amount: invoice.amountInCents,
          currency: 'ZAR',
          reference: invoice.paystackReference,
          metadata: { companyId: company.id, invoiceId: invoice.id },
        },
      });
    } catch (err) {
      // The webhook is the source of truth for the outcome - a failure to
      // even initiate the charge just leaves the invoice pending, and the
      // retry job will pick it up like any other stalled attempt.
      console.error(`Could not initiate monthly charge for company ${company.id}:`, err);
    }
  }

  return new Response('ok', { status: 200 });
};
