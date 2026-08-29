import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listSubmissionsForDriver } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
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
        <div className="banner-success">Submitted as {location.state.justSubmitted}. It is now awaiting review.</div>
      )}
      {submissions === undefined && <div className="page-loading">Loading…</div>}
      {submissions?.length === 0 && <p className="muted">No condition checks submitted yet.</p>}
      {submissions && submissions.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Reference</th><th>Vehicle</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{s.ref}</td>
                  <td>{s.vehicle} · {s.reg}</td>
                  <td><StatusChip status={s.status} /></td>
                  <td>{s.status === 'Declined' && <Link to="/check" className="btn-secondary btn-inline">Submit again</Link>}</td>
                </tr>
                {s.status === 'Declined' && (
                  <tr>
                    <td colSpan={5} className="decline-detail">
                      {(s.declineReasons || []).length > 0 && (
                        <span>{s.declineReasons.join(' · ')}</span>
                      )}
                      {s.declineNotes && <span> — {s.declineNotes}</span>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
