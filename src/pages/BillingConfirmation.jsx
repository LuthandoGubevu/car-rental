import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export function BillingConfirmation() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const [state, setState] = useState('checking'); // checking | ok | failed

  useEffect(() => {
    if (!reference) {
      setState('failed');
      return;
    }
    fetch(`/.netlify/functions/paystack-verify-authorization?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => setState(data.ok ? 'ok' : 'failed'))
      .catch(() => setState('failed'));
  }, [reference]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">FleetCare</div>
        {state === 'checking' && (
          <>
            <h1>Confirming your payment</h1>
            <p className="auth-sub">This will only take a moment.</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <h1>Payment method saved</h1>
            <p className="auth-sub">Thanks, your card is on file and this month's invoice is settled. You can close this page.</p>
          </>
        )}
        {state === 'failed' && (
          <>
            <h1>Something went wrong</h1>
            <p className="auth-sub">We could not confirm this payment. Please contact FleetCare and we'll help sort it out.</p>
          </>
        )}
        <p className="auth-foot"><Link to="/">Back to FleetCare</Link></p>
      </div>
    </div>
  );
}
