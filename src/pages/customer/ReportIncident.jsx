import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver, createIncident, listIncidentsForDriver } from '../../lib/firestore';

const TYPES = ['Collision', 'Theft or break-in', 'Windscreen or glass damage', 'Mechanical breakdown', 'Other'];

export function ReportIncident() {
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState(undefined);
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({ type: TYPES[0], description: '', date: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [successRef, setSuccessRef] = useState(null);

  useEffect(() => {
    getVehicleForDriver(user.uid).then(setVehicle).catch(() => setError('We could not load your vehicle.'));
    listIncidentsForDriver(user.uid).then(setIncidents).catch(() => setError('We could not load your incident history.'));
  }, [user.uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.description.trim()) {
      setError('Add a short description so your fleet team knows what happened.');
      return;
    }
    setBusy(true);
    try {
      const { ref } = await createIncident({ uid: user.uid, companyId: profile?.companyId, driverName: profile?.name, vehicle, ...form });
      setForm({ type: TYPES[0], description: '', date: '' });
      // Best-effort refresh - the incident above is already saved, so a
      // failure here shouldn't make a successful submission look failed.
      listIncidentsForDriver(user.uid).then(setIncidents).catch((err) => console.error('Could not refresh incidents:', err));
      setSuccessRef(ref);
    } catch {
      setError('We could not log this incident. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Report an Incident</h1>

      {successRef && (
        <div className="banner banner-success">
          <span className="banner-icon">✓</span>
          Incident logged. Reference {successRef}; your fleet team will follow up.
        </div>
      )}
      {error && (
        <div className="banner banner-error">
          <span className="banner-icon">!</span>
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label>What happened</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Date it happened</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-field span-2">
            <label>Describe it</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Where it happened, whether anyone else was involved, and any damage you can see."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit incident'}</button>
        </form>
      </div>

      <h2 className="section-title">Past incidents</h2>
      {incidents.length === 0 && (
        <div className="empty-dashed">
          <div className="empty-dashed-title">No incidents reported</div>
          <div className="empty-dashed-body">Anything you log will stay here with its status.</div>
        </div>
      )}
      {incidents.map((i) => (
        <div key={i.id} className="card incident-row">
          <strong>{i.type}</strong>
          <p className="muted">{i.description}</p>
        </div>
      ))}
    </div>
  );
}
