import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listSubmissions } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Outcomes() {
  const { profile } = useAuth();
  const companyId = profile?.companyId;
  const [tab, setTab] = useState('declined');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    if (!companyId) return;
    listSubmissions(undefined, companyId).then((all) => setSubmissions(all.filter((s) => s.status !== 'Awaiting Review')));
  }, [companyId]);

  const declinedSubs = submissions.filter((s) => s.status === 'Declined');
  const visible = tab === 'declined' ? declinedSubs : submissions;

  return (
    <div className="page">
      <h1>Outcomes</h1>
      <p className="page-sub">Recorded verdicts for the team to action</p>
      <div className="toolbar">
        <div className="tabs">
          <button className={tab === 'declined' ? 'tab active' : 'tab'} onClick={() => setTab('declined')}>
            Declined <span className="tab-count">{declinedSubs.length}</span>
          </button>
          <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
            All reviewed <span className="tab-count">{submissions.length}</span>
          </button>
        </div>
      </div>
      <div className="table-card">
        <table className="table">
          <thead><tr><th>Date</th><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Reviewed by</th><th>Outcome</th><th>Reason</th></tr></thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.reviewedAt || s.createdAt)}</td>
                <td>{s.ref}</td>
                <td>{s.vehicle} · {s.reg}</td>
                <td>{s.customer}</td>
                <td className="dim">{s.reviewedBy || '—'}</td>
                <td><StatusChip status={s.status} /></td>
                <td className="dim">{(s.declineReasons || []).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">{tab === 'declined' ? 'No declined submissions' : 'No reviewed submissions yet'}</div>
            <div className="table-empty-body">
              {tab === 'declined'
                ? 'Submissions declined with feedback will be listed here.'
                : 'Approved and declined submissions will be listed here.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
