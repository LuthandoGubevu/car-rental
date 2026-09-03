import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BRANCHES = ['East London', 'Gqeberha', 'Johannesburg', 'Kempton Park', 'Pretoria', 'Cape Town', 'George', 'uMhlanga'];

const FIELDS = [
  ['firstName', 'First name', 'e.g. Luthando'],
  ['surname', 'Surname', 'e.g. Gubevu'],
  ['idNumber', 'SA ID number', 'e.g. 9204125800083'],
  ['mobile', 'Mobile number', 'e.g. 072 418 2290'],
  ['email', 'Email address', 'name@example.co.za'],
  ['number', 'Customer or contract number (optional)', 'e.g. SAML-004182'],
];

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ branch: BRANCHES[0] });
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const required = ['firstName', 'surname', 'idNumber', 'mobile', 'email'];
  const missing = tried && required.some((f) => !String(form[f] || '').trim());

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    if (required.some((f) => !String(form[f] || '').trim()) || !password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signUp({ ...form, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.code === 'auth/email-already-in-use'
        ? 'An account with that email already exists.'
        : 'We could not create your account. Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-wide">
        <div className="brand-mark">Car Care</div>
        <h1>Register as a driver</h1>
        <p className="auth-sub">Used to sign in and to identify you on your monthly condition check.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {FIELDS.map(([key, label, placeholder]) => (
              <div key={key} className="form-field">
                <label>{label}</label>
                <input
                  type={key === 'email' ? 'email' : 'text'}
                  value={form[key] || ''}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                  className={missing && required.includes(key) && !String(form[key] || '').trim() ? 'field-error' : ''}
                />
              </div>
            ))}
            <div className="form-field">
              <label>Branch</label>
              <select value={form.branch} onChange={(e) => update('branch', e.target.value)}>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
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
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
