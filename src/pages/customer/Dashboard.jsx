import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver, getLatestSubmissionForDriver } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isDue(vehicle) {
  const last = vehicle?.lastInspectionAt?.toDate?.();
  if (!last) return true;
  return Date.now() - last.getTime() > THIRTY_DAYS_MS;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState(undefined);
  const [latestSubmission, setLatestSubmission] = useState(undefined);

  useEffect(() => {
    let active = true;
    getVehicleForDriver(user.uid).then((v) => {
      if (active) setVehicle(v);
    });
    getLatestSubmissionForDriver(user.uid).then((s) => {
      if (active) setLatestSubmission(s);
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
      <h1>Welcome, {profile?.firstName || profile?.name}</h1>
      <p className="page-sub">{profile?.branch} branch{profile?.number ? ` · ${profile.number}` : ''}</p>

      {!vehicle && (
        <div className="card empty-card">
          <p>No vehicle is linked to your account yet. Contact your branch to have one assigned.</p>
        </div>
      )}

      {latestSubmission?.status === 'Declined' && (
        <div className="card decline-banner">
          <h2>Your last submission was declined</h2>
          {(latestSubmission.declineReasons || []).length > 0 && (
            <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              {latestSubmission.declineReasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {latestSubmission.declineNotes && <p className="muted">{latestSubmission.declineNotes}</p>}
          <Link to="/check" className="btn-primary btn-inline">Submit again</Link>
        </div>
      )}

      {vehicle && (
        <div className="card vehicle-card">
          <div className="vehicle-card-top">
            <div>
              <h2>{vehicle.make} {vehicle.model}</h2>
              <p className="muted">{vehicle.reg} · {vehicle.year}</p>
            </div>
            <StatusChip status={due ? 'Inspection Due' : vehicle.status} />
          </div>
          <p className={due ? 'due-banner' : 'ok-banner'}>
            {due ? 'Your monthly condition check is due.' : 'You are up to date on your condition check.'}
          </p>
          <Link to="/check" className="btn-primary btn-inline">Start Vehicle Condition Check</Link>
        </div>
      )}
    </div>
  );
}
