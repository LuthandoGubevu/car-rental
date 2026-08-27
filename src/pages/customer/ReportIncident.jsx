import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver, createIncident, listIncidentsForDriver } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const TYPES = ['Collision', 'Theft or break-in', 'Windscreen or glass damage', 'Mechanical breakdown', 'Other'];

export function ReportIncident() {
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState(undefined);
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({ type: TYPES[0], description: '', date: '' });
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  useEffect(() => {
    getVehicleForDriver(user.uid).then(setVehicle);
    listIncidentsForDriver(user.uid).then(setIncidents);
  }, [user.uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setBusy(true);
    try {
      await createIncident({ uid: user.uid, driverName: profile?.name, vehicle, ...form });
      setForm({ type: TYPES[0], description: '', date: '' });
      listIncidentsForDriver(user.uid).then(setIncidents);
      flash('Incident logged. Your fleet team has been notified.');
    } catch {
      flash('We could not log this incident. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Report an Incident</h1>
      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-field span-2">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happened?" />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit incident'}</button>
        </form>
      </div>

      <h2 className="section-title">Past incidents</h2>
      {incidents.length === 0 && <p className="muted">No incidents reported.</p>}
      {incidents.map((i) => (
        <div key={i.id} className="card incident-row">
          <strong>{i.type}</strong>
          <p className="muted">{i.description}</p>
        </div>
      ))}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
