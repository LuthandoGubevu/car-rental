import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from './_lib/firebaseAdmin.js';
import { paystackFetch } from './_lib/paystack.js';
import { createPendingInvoice, findExistingInvoice } from './_lib/billing.js';

// Staff-only: generates a Paystack hosted checkout link for a company's
// first payment (and card capture in the same step). Staff copies the
// returned link and sends it to the company's admin externally, the same
// trust model as the existing invite-link flow.
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) return new Response('Unauthorized', { status: 401 });

  let decoded;
  try {
    decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = getAdminDb();
  const userSnap = await db.collection('users').doc(decoded.uid).get();
  if (!userSnap.exists || userSnap.data().role !== 'staff') {
    return new Response('Forbidden', { status: 403 });
  }

  const { companyId } = await req.json();
  if (!companyId) return new Response('companyId is required', { status: 400 });

  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) return new Response('Company not found', { status: 404 });
  const company = { id: companySnap.id, ...companySnap.data() };

  if (!company.contactEmail) {
    return new Response('This company has no contact email on file', { status: 400 });
  }

  let customerCode = company.paystackCustomerCode;
  if (!customerCode) {
    const [firstName, ...rest] = (company.contactName || company.name || '').split(' ');
    const customer = await paystackFetch('/customer', {
      method: 'POST',
      body: {
        email: company.contactEmail,
        first_name: firstName || company.name,
        last_name: rest.join(' ') || '-',
        phone: company.contactPhone || undefined,
      },
    });
    customerCode = customer.customer_code;
    await db.collection('companies').doc(companyId).update({ paystackCustomerCode: customerCode });
  }

  const vehiclesSnap = await db.collection('vehicles').where('companyId', '==', companyId).get();
  const vehicles = vehiclesSnap.docs.map((d) => d.data());

  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let invoice = await findExistingInvoice(companyId, periodKey);
  if (!invoice) {
    invoice = await createPendingInvoice({ company, vehicles });
  }

  const site = process.env.URL || 'http://localhost:8888';
  const transaction = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: {
      email: company.contactEmail,
      amount: invoice.amountInCents,
      currency: 'ZAR',
      channels: ['card'],
      reference: invoice.paystackReference,
      callback_url: `${site}/billing-confirmation`,
      metadata: { companyId, invoiceId: invoice.id },
    },
  });

  return new Response(JSON.stringify({ authorizationUrl: transaction.authorization_url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
