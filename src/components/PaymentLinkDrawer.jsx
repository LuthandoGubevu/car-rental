import { useState } from 'react';
import { auth } from '../firebase';

export function PaymentLinkDrawer({ company, onClose, onError }) {
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!company) return null;

  async function generateLink() {
    setBusy(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/.netlify/functions/paystack-init-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ companyId: company.id }),
      });
      if (!res.ok) {
        const message = await res.text().catch(() => '');
        throw new Error(message || 'Request failed');
      }
      const { authorizationUrl } = await res.json();
      setLink(authorizationUrl);
    } catch (err) {
      onError?.(err.message || 'We could not generate a payment link. Please try again.');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable - the link is still selectable by hand below.
    }
  }

  return (
    <div className="drawer-backdrop">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-eyebrow">{company.name}</div>
            <h2 className="drawer-title">Payment link</h2>
            <p className="drawer-meta">Send this so they can add a card and complete their first payment.</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          {link ? (
            <div className="form-field">
              <label>Payment link</label>
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </div>
          ) : (
            <p className="muted">This creates a one time Paystack checkout link for {company.name}'s first invoice, covering their current fleet size at R30 per vehicle.</p>
          )}
        </div>
        <div className="drawer-foot">
          {link ? (
            <button className="btn-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={generateLink}>{busy ? 'Generating…' : 'Generate link'}</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
