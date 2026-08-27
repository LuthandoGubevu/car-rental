import { useEffect, useState } from 'react';
import { listSubmissions } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Outcomes() {
  const [tab, setTab] = useState('fails');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    listSubmissions().then((all) => setSubmissions(all.filter((s) => s.status !== 'Awaiting Review')));
  }, []);

  const visible = tab === 'fails' ? submissions.filter((s) => s.status === 'Follow-up Required') : submissions;

  return (
    <div className="page">
      <h1>Outcomes</h1>
      <p className="page-sub">Recorded verdicts for the team to action</p>
      <div className="tabs">
        <button className={tab === 'fails' ? 'tab active' : 'tab'} onClick={() => setTab('fails')}>Needs follow-up</button>
        <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>All reviewed</button>
      </div>
      <table className="table">
        <thead><tr><th>Date</th><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Reviewed by</th><th>Outcome</th></tr></thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.reviewedAt || s.createdAt)}</td>
              <td>{s.ref}</td>
              <td>{s.vehicle} · {s.reg}</td>
              <td>{s.customer}</td>
              <td>{s.reviewedBy || '—'}</td>
              <td><StatusChip status={s.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && <p className="muted">Nothing here.</p>}
    </div>
  );
}
