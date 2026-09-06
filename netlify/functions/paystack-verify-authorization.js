import { getAdminDb } from './_lib/firebaseAdmin.js';
import { paystackFetch } from './_lib/paystack.js';
import { recordSuccessfulCharge } from './_lib/billing.js';

// Public - reached by /billing-confirmation after Paystack redirects back
// with ?reference=. Trust boundary here is Paystack's own verify response,
// not any token issued by us - a random reference just returns ok:false.
export default async (req) => {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) {
    return Response.json({ ok: false, reason: 'Missing reference' }, { status: 400 });
  }

  let data;
  try {
    data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  } catch {
    return Response.json({ ok: false, reason: 'Could not verify this transaction' }, { status: 502 });
  }

  if (data.status !== 'success' || data.currency !== 'ZAR') {
    return Response.json({ ok: false, reason: 'Payment was not successful' });
  }

  const companyId = data.metadata?.companyId;
  if (!companyId) {
    return Response.json({ ok: false, reason: 'Missing company reference on this transaction' });
  }

  await recordSuccessfulCharge(reference, data);

  const db = getAdminDb();
  const companyRef = db.collection('companies').doc(companyId);
  const companySnap = await companyRef.get();
  if (companySnap.exists && !companySnap.data().billingActivatedAt) {
    const authorization = data.authorization || {};
    await companyRef.update({
      paystackAuthorizationCode: authorization.authorization_code || null,
      paystackAuthorizationEmail: data.customer?.email || null,
      cardBrand: authorization.card_type || null,
      cardLast4: authorization.last4 || null,
      cardExpMonth: authorization.exp_month || null,
      cardExpYear: authorization.exp_year || null,
      billingStatus: 'active',
      billingActivatedAt: new Date().toISOString(),
    });
  }

  return Response.json({ ok: true });
};
