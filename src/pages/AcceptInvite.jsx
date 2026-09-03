import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInvite } from '../lib/firestore';

export function AcceptInvite() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [invite, setInvite] = useState(undefined); // undefined = loading, null = not found
  const [form, setForm] = useState({ firstName: '', surname: '', idNumber: '', mobile: '', number: '', branch: '' });
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInvite(inviteId)
      .then(setInvite)
      .catch(() => setInvite(null));
  }, [inviteId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const isDriver = invite?.role === 'driver';
  const required = isDriver ? ['firstName', 'surname', 'idNumber', 'mobile'] : ['firstName'];
  const missing = tried && required.some((f) => !String(form[f] || '').trim());

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    if (required.some((f) => !String(form[f] || '').trim()) || !password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(inviteId, form, password, invite.email);
      navigate(invite.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(
        err?.code === 'auth/email-already-in-use'
          ? 'An account with that email already exists. Try signing in instead.'
          : err?.message === 'This invite has already been used.'
            ? err.message
            : 'We could not set up your account. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (invite === undefined) {
    return (
      <div className="auth-screen">
        <div className="auth-card"><p className="muted">Loading your invite…</p></div>
      </div>
    );
  }

  if (!invite || invite.status !== 'pending') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">Car Care</div>
          <h1>Invite not available</h1>
          <p className="auth-sub">
            {invite ? 'This invite has already been used or was revoked.' : "We couldn't find that invite link."}
          </p>
          <p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className={isDriver ? 'auth-card auth-card-wide' : 'auth-card'}>
        <div className="brand-mark">Car Care</div>
        <h1>Join {invite.companyName}</h1>
        <p className="auth-sub">
          You've been invited as {invite.role === 'admin' ? 'a fleet administrator' : 'a driver'}. Set a password to finish setting up your account.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Email</label>
              <input value={invite.email} disabled />
            </div>
            <div className="form-field">
              <label>First name</label>
              <input
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className={missing && !form.firstName.trim() ? 'field-error' : ''}
              />
            </div>
            {isDriver && (
              <>
                <div className="form-field">
                  <label>Surname</label>
                  <input
                    value={form.surname}
                    onChange={(e) => update('surname', e.target.value)}
                    className={missing && !form.surname.trim() ? 'field-error' : ''}
                  />
                </div>
                <div className="form-field">
                  <label>SA ID number</label>
                  <input
                    value={form.idNumber}
                    onChange={(e) => update('idNumber', e.target.value)}
                    className={missing && !form.idNumber.trim() ? 'field-error' : ''}
                  />
                </div>
                <div className="form-field">
                  <label>Mobile number</label>
                  <input
                    value={form.mobile}
                    onChange={(e) => update('mobile', e.target.value)}
                    className={missing && !form.mobile.trim() ? 'field-error' : ''}
                  />
                </div>
                <div className="form-field">
                  <label>Branch / depot</label>
                  <input value={form.branch} onChange={(e) => update('branch', e.target.value)} placeholder="e.g. Johannesburg" />
                </div>
                <div className="form-field">
                  <label>Customer or contract number <span className="optional">optional</span></label>
                  <input value={form.number} onChange={(e) => update('number', e.target.value)} />
                </div>
              </>
            )}
            <div className={isDriver ? 'form-field' : 'form-field span-2'}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={tried && !password.trim() ? 'field-error' : ''}
              />
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? 'Setting up your account…' : 'Finish setup'}
          </button>
        </form>
        <p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
