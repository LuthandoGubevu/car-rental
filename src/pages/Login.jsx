import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setTried(true);
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('We could not sign you in with those details. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">Car Care</div>
        <h1>Sign in</h1>
        <p className="auth-sub">Submit your monthly vehicle condition check or review submissions.</p>
        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. name@example.co.za"
            className={tried && !email.trim() ? 'field-error' : ''}
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className={tried && !password.trim() ? 'field-error' : ''}
          />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-foot">
          Need an account? <Link to="/signup">Register as a driver</Link>
        </p>
      </div>
    </div>
  );
}
