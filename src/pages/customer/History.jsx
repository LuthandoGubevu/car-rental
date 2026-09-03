import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listSubmissionsForDriver } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthTile(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase();
}

export function History() {
  const { user } = useAuth();
  const location = useLocation();
  const [submissions, setSubmissions] = useState(undefined);

  useEffect(() => {
    listSubmissionsForDriver(user.uid).then(setSubmissions);
  }, [user.uid]);

  return (
    <div className="page">
      <h1>Inspection History</h1>
      {location.state?.justSubmitted && (
        <div className="banner banner-success">
          <span className="banner-icon">✓</span>
          Submitted as {location.state.justSubmitted}. It is now awaiting review.
        </div>
      )}

      {submissions === undefined && (
        <div className="skeleton-list">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {submissions?.length === 0 && (
        <div className="empty-dashed">
          <div className="empty-dashed-title">No condition checks submitted yet</div>
          <div className="empty-dashed-body">Your monthly submissions will appear here once you complete one.</div>
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissions.map((s) => (
            <div key={s.id} className="history-row">
              <div className="history-month">{monthTile(s.createdAt)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="history-ref">{s.ref} · {s.vehicle} · {s.reg}</div>
                <div className="history-detail">
                  {formatDate(s.createdAt)}{s.reviewedBy ? ` · reviewed by ${s.reviewedBy}` : ''}
                </div>
                {s.status === 'Declined' && (
                  <div className="history-detail">
                    {(s.declineReasons || []).join(' · ')}
                    {s.declineNotes ? ` — ${s.declineNotes}` : ''}
                    {' '}<Link to="/dashboard/check">Submit again</Link>
                  </div>
                )}
              </div>
              <StatusChip status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
