import { useEffect, useState } from 'react';
import { listDemoRequests, markDemoRequestContacted } from '../../lib/firestore';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DemoRequests() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('open');
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, flash] = useFlash();

  function refresh() {
    listDemoRequests().then(setRequests);
  }

  useEffect(refresh, []);

  const newRequests = requests.filter((r) => r.status === 'New');
  const visible = tab === 'open' ? newRequests : requests;

  async function contact(request) {
    setBusy(request.id);
    try {
      await markDemoRequestContacted(request.id, profile?.name);
      flash(`${request.company} marked as contacted.`);
      refresh();
    } catch {
      flash('We could not update this request.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <h1>Demo Requests</h1>
      <p className="page-sub">Prospects who booked a demo from the public site</p>
      <div className="toolbar">
        <div className="tabs">
          <button className={tab === 'open' ? 'tab active' : 'tab'} onClick={() => setTab('open')}>
            New <span className="tab-count">{newRequests.length}</span>
          </button>
          <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
            All requests <span className="tab-count">{requests.length}</span>
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Company</th><th>Contact</th><th>Email</th>
              <th>Phone</th><th>Fleet size</th><th>Message</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.createdAt)}</td>
                <td>{r.company}</td>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td className="dim">{r.phone || '—'}</td>
                <td className="dim">{r.fleetSize || '—'}</td>
                <td className="dim">{r.message || '—'}</td>
                <td><StatusChip status={r.status} /></td>
                <td>
                  {r.status === 'New' && (
                    <button className="btn-row-action" disabled={busy === r.id} onClick={() => contact(r)}>
                      {busy === r.id ? 'Marking…' : 'Mark as contacted'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">{tab === 'open' ? 'No new requests' : 'No demo requests yet'}</div>
            <div className="table-empty-body">
              {tab === 'open'
                ? 'Every request has been contacted. New ones land here as prospects submit the form.'
                : 'Requests booked from the public site will appear here.'}
            </div>
          </div>
        )}
      </div>
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
