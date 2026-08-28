import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { findUserByEmail, setUserRole } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

export function Team() {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  async function handleSearch(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const found = await findUserByEmail(email.trim());
      setResult(found);
      setSearched(true);
    } catch {
      flash('Search failed. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole() {
    const nextRole = result.role === 'admin' ? 'customer' : 'admin';
    if (result.uid === currentUser.uid && nextRole !== 'admin') {
      flash('You cannot remove your own admin access.', 'error');
      return;
    }
    setBusy(true);
    try {
      await setUserRole(result.uid, nextRole);
      setResult((r) => ({ ...r, role: nextRole }));
      flash(`${result.email} is now ${nextRole === 'admin' ? 'an admin' : 'a driver'}.`);
    } catch {
      flash('We could not update this account.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Team</h1>
      <p className="page-sub">Look up an account by email and grant or remove admin access.</p>

      <form onSubmit={handleSearch} className="toolbar">
        <input
          type="email"
          placeholder="name@example.co.za"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={busy}>Search</button>
      </form>

      {searched && !result && <p className="muted">No account found with that email. They need to sign up first.</p>}

      {result && (
        <div className="card">
          <div className="vehicle-card-top">
            <div>
              <h2>{result.name || result.email}</h2>
              <p className="muted">{result.email}</p>
            </div>
            <span className="chip" style={{ background: result.role === 'admin' ? '#dbeafe' : '#f1f5f9', color: result.role === 'admin' ? '#1d4ed8' : '#475569' }}>
              {result.role === 'admin' ? 'Admin' : 'Driver'}
            </span>
          </div>
          <button
            className={result.role === 'admin' ? 'btn-danger btn-inline' : 'btn-primary btn-inline'}
            disabled={busy}
            onClick={toggleRole}
          >
            {result.role === 'admin' ? 'Remove admin access' : 'Make admin'}
          </button>
        </div>
      )}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
