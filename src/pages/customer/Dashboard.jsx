import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver, getLatestSubmissionForDriver, listSubmissionsForDriver } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isDue(vehicle) {
  const last = vehicle?.lastInspectionAt?.toDate?.();
  if (!last) return true;
  return Date.now() - last.getTime() > THIRTY_DAYS_MS;
}

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState(undefined);
  const [latestSubmission, setLatestSubmission] = useState(undefined);
  const [checksCompleted, setChecksCompleted] = useState(undefined);

  useEffect(() => {
    let active = true;
    getVehicleForDriver(user.uid).then((v) => {
      if (active) setVehicle(v);
    });
    getLatestSubmissionForDriver(user.uid).then((s) => {
      if (active) setLatestSubmission(s);
    });
    listSubmissionsForDriver(user.uid).then((subs) => {
      if (active) setChecksCompleted(subs.length);
    });
    return () => {
      active = false;
    };
    // user.uid is stable for the session; re-fetching on every profile change
    // would refire on unrelated profile edits (e.g. notification prefs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (vehicle === undefined) return <div className="page-loading">Loading your vehicle…</div>;

  const due = vehicle && isDue(vehicle);

  return (
    <div className="page">
      <h1>Welcome back, {profile?.firstName || profile?.name}</h1>
      <p className="page-sub">{profile?.branch} branch{profile?.number ? ` · ${profile.number}` : ''}</p>

      {!vehicle && (
        <div className="card empty-card">
          <p>No vehicle is linked to your account yet. Contact your branch to have one assigned.</p>
        </div>
      )}

      {latestSubmission?.status === 'Declined' && (
        <div className="card decline-banner">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="banner-icon" style={{ background: 'var(--error)' }}>!</span>
            Your last submission was declined
          </h2>
          {(latestSubmission.declineReasons || []).length > 0 && (
            <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              {latestSubmission.declineReasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {latestSubmission.declineNotes && <p className="muted">{latestSubmission.declineNotes}</p>}
          <Link to="/dashboard/check" className="btn-primary btn-inline">Submit again</Link>
        </div>
      )}

      {vehicle && (
        <>
          <div className="card card-lg">
            <div className="card-band">
              <div className="vehicle-card-top">
                <div>
                  <h2>{vehicle.make} {vehicle.model}</h2>
                  <p className="card-meta">{vehicle.reg} · {vehicle.year} · {vehicle.mileage ? `${vehicle.mileage} km` : '— km'}</p>
                </div>
                <StatusChip status={due ? 'Inspection Due' : vehicle.status} />
              </div>
            </div>
            <div className="card-band card-band-cta">
              <p className={due ? 'due-banner' : 'ok-banner'}>
                {due ? 'Your monthly condition check is due.' : 'You are up to date on your condition check.'}
              </p>
              <p className="muted" style={{ margin: '4px 0 14px' }}>
                {vehicle.lastInspectionAt ? `Last completed ${formatDate(vehicle.lastInspectionAt)}` : "You haven't completed one yet."}
              </p>
              <Link to="/dashboard/check" className={due ? 'btn-orange btn-inline' : 'btn-primary btn-inline'}>
                {due ? 'Start condition check' : 'Up to date'}
              </Link>
            </div>
            <div className="card-band">
              <div className="facts-strip">
                <div>
                  <div className="fact-label">Condition</div>
                  <div className="fact-value">{vehicle.condition || 'Not yet assessed'}</div>
                </div>
                <div>
                  <div className="fact-label">Checks completed</div>
                  <div className="fact-value">{checksCompleted === undefined ? '—' : checksCompleted}</div>
                </div>
                <div>
                  <div className="fact-label">Branch</div>
                  <div className="fact-value">{vehicle.branch || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-actions-grid">
            <Link to="/dashboard/vehicle" className="card-action">
              <div className="card-action-title">Vehicle details</div>
              <div className="card-action-sub">Full specs, condition and inspection history for your vehicle.</div>
            </Link>
            <Link to="/dashboard/incident" className="card-action">
              <div className="card-action-title">Report an incident</div>
              <div className="card-action-sub">Log an accident, breakdown or damage so your fleet team can follow up.</div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
