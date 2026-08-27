import { useEffect, useState } from 'react';
import { listSubmissions, recordVerdict } from '../../lib/firestore';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReviewQueue() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('open');
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  function refresh() {
    listSubmissions().then(setSubmissions);
  }

  useEffect(refresh, []);

  const visible = tab === 'open' ? submissions.filter((s) => s.status === 'Awaiting Review') : submissions;

  async function decide(verdict) {
    setBusy(true);
    try {
      await recordVerdict(selected.id, { verdict, reviewedBy: profile?.name });
      flash(verdict === 'meets' ? `${selected.ref} recorded as meeting the standard.` : `${selected.ref} flagged for follow-up.`);
      setSelected(null);
      refresh();
    } catch {
      flash('We could not record this verdict.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Review Queue</h1>
      <div className="tabs">
        <button className={tab === 'open' ? 'tab active' : 'tab'} onClick={() => setTab('open')}>Awaiting review</button>
        <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>All submissions</button>
      </div>

      <table className="table">
        <thead><tr><th>Date</th><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.createdAt)}</td>
              <td>{s.ref}</td>
              <td>{s.vehicle} · {s.reg}</td>
              <td>{s.customer}</td>
              <td><StatusChip status={s.status} /></td>
              <td><button className="btn-secondary" onClick={() => setSelected(s)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && <p className="muted">Nothing here.</p>}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.ref} · {selected.vehicle} · {selected.reg}</h2>
            <p className="muted">{selected.customer} · {selected.branch}</p>
            <div className="review-grid">
              {Object.entries(selected.photos || {}).map(([angle, url]) => (
                <div key={angle} className="review-photo">
                  <img src={url} alt={angle} />
                  <span>{angle}</span>
                </div>
              ))}
            </div>
            {selected.damage ? (
              <div className="damage-summary">
                <strong>Damage reported:</strong> {selected.damage.type} — {selected.damage.area || 'area not specified'}
                <p className="muted">{selected.damage.description}</p>
              </div>
            ) : (
              <div className="damage-summary muted">No damage reported.</div>
            )}
            {selected.status === 'Awaiting Review' ? (
              <div className="modal-actions">
                <button className="btn-primary" disabled={busy} onClick={() => decide('meets')}>Meets standard</button>
                <button className="btn-danger" disabled={busy} onClick={() => decide('follow-up')}>Needs follow-up</button>
              </div>
            ) : (
              <p className="muted">Reviewed by {selected.reviewedBy || '—'} · {selected.verdict === 'meets' ? 'Meets standard' : 'Needs follow-up'}</p>
            )}
            <button className="btn-ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
