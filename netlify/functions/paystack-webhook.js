import crypto from 'node:crypto';
import { recordSuccessfulCharge, recordFailedCharge } from './_lib/billing.js';

// Public - called by Paystack directly. Security is the HMAC signature
// alone: Paystack signs with the secret key itself, there's no separate
// webhook signing secret to configure in the dashboard.
export default async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';

  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const validSignature =
    signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  if (!validSignature) return new Response('Invalid signature', { status: 401 });

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const data = event.data || {};
  try {
    if (event.event === 'charge.success') {
      await recordSuccessfulCharge(data.reference, data);
    } else if (event.event === 'charge.failed') {
      await recordFailedCharge(data.reference, data);
    }
    // Any other event type: acknowledged, not acted on.
  } catch (err) {
    console.error('Paystack webhook processing error:', err);
  }

  // Always 200 once the signature checks out, so Paystack doesn't retry a
  // delivery we've already accepted, even if our own processing errored.
  return new Response('ok', { status: 200 });
};
