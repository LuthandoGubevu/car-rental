import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listVehicles, listSubmissions } from '../../lib/firestore';

export function Overview() {
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    listVehicles().then(setVehicles);
    listSubmissions().then(setSubmissions);
  }, []);

  const awaiting = submissions.filter((s) => s.status === 'Awaiting Review').length;
  const declined = submissions.filter((s) => s.status === 'Declined').length;
  const inspectionDue = vehicles.filter((v) => v.status === 'Inspection Due').length;

  const stats = [
    ['Vehicles in fleet', vehicles.length],
    ['Awaiting review', awaiting],
    ['Declined', declined],
    ['Inspection due', inspectionDue],
  ];

  return (
    <div className="page">
      <h1>Overview</h1>
      <p className="page-sub">Condition checks at a glance</p>
      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div key={label} className="card stat-card">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Next steps</h2>
        <p className="muted"><Link to="/admin/queue">Review queue</Link> has {awaiting} submission{awaiting === 1 ? '' : 's'} waiting on a verdict.</p>
      </div>
    </div>
  );
}
