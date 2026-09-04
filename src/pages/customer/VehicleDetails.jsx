import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROWS = [
  ['make', 'Make'],
  ['model', 'Model'],
  ['year', 'Year'],
  ['reg', 'Registration'],
  ['vin', 'VIN'],
  ['mileage', 'Mileage'],
  ['branch', 'Branch'],
];

export function VehicleDetails() {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    getVehicleForDriver(user.uid)
      .then(setVehicle)
      .catch(() => {
        setVehicle(null);
        setError(true);
      });
  }, [user.uid]);

  if (vehicle === undefined) return <div className="page-loading">Loading…</div>;
  if (error) {
    return (
      <div className="page">
        <div className="banner banner-error"><span className="banner-icon">!</span>We could not load your vehicle. Please try again.</div>
      </div>
    );
  }
  if (!vehicle) return <div className="page"><p className="muted">No vehicle is linked to your account.</p></div>;

  return (
    <div className="page">
      <h1>Vehicle Details</h1>
      <div className="card card-lg">
        <div className="card-band-head">
          <div className="vehicle-card-top">
            <h2>{vehicle.make} {vehicle.model}</h2>
            <StatusChip status={vehicle.status} />
          </div>
        </div>
        <dl className="detail-list">
          {ROWS.map(([key, label]) => (
            <div key={key} className="detail-row">
              <dt>{label}</dt>
              <dd>{vehicle[key] || '—'}</dd>
            </div>
          ))}
          <div className="detail-row">
            <dt>Last inspection</dt>
            <dd>{formatDate(vehicle.lastInspectionAt)}</dd>
          </div>
          <div className="detail-row">
            <dt>Condition</dt>
            <dd><StatusChip status={vehicle.condition} /></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
