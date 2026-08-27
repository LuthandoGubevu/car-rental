import { useEffect, useState } from 'react';
import { listVehicles, addVehicle, findUserByEmail } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const STATUSES = ['Active Lease', 'Available', 'Inspection Due', 'Under Review', 'Maintenance', 'Accident Repair', 'Returned', 'Sold'];

const EMPTY_DRAFT = { make: '', model: '', year: '', reg: '', vin: '', mileage: '', branch: '', driverEmail: '' };

export function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  function refresh() {
    listVehicles().then(setVehicles);
  }

  useEffect(refresh, []);

  const filtered = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All statuses' || v.status === statusFilter;
    const haystack = `${v.make} ${v.model} ${v.reg} ${v.customer || ''}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  async function handleAdd(e) {
    e.preventDefault();
    if (!draft.make.trim() || !draft.model.trim() || !draft.reg.trim()) return;
    setBusy(true);
    try {
      let driverUid = null;
      let customer = '';
      if (draft.driverEmail.trim()) {
        const driver = await findUserByEmail(draft.driverEmail.trim());
        if (driver) {
          driverUid = driver.uid;
          customer = driver.name;
        } else {
          flash('No driver account found with that email. The vehicle was saved without a driver linked.', 'error');
        }
      }
      await addVehicle({ ...draft, driverUid, customer, status: driverUid ? 'Active Lease' : 'Available' });
      setDraft(EMPTY_DRAFT);
      setFormOpen(false);
      refresh();
      flash('Vehicle added.');
    } catch {
      flash('We could not add this vehicle.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Vehicles</h1>
      <div className="toolbar">
        <input placeholder="Search make, model, reg or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : 'Add vehicle'}</button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} className="card form-grid">
          <div className="form-field"><label>Make</label><input value={draft.make} onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value }))} /></div>
          <div className="form-field"><label>Model</label><input value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} /></div>
          <div className="form-field"><label>Year</label><input value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))} /></div>
          <div className="form-field"><label>Registration</label><input value={draft.reg} onChange={(e) => setDraft((d) => ({ ...d, reg: e.target.value }))} /></div>
          <div className="form-field"><label>VIN</label><input value={draft.vin} onChange={(e) => setDraft((d) => ({ ...d, vin: e.target.value }))} /></div>
          <div className="form-field"><label>Mileage</label><input value={draft.mileage} onChange={(e) => setDraft((d) => ({ ...d, mileage: e.target.value }))} /></div>
          <div className="form-field"><label>Branch</label><input value={draft.branch} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} /></div>
          <div className="form-field"><label>Driver email (optional)</label><input value={draft.driverEmail} onChange={(e) => setDraft((d) => ({ ...d, driverEmail: e.target.value }))} placeholder="Must already have a driver account" /></div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle'}</button>
        </form>
      )}

      <table className="table">
        <thead><tr><th>Vehicle</th><th>Reg</th><th>Branch</th><th>Customer</th><th>Status</th><th>Condition</th></tr></thead>
        <tbody>
          {filtered.map((v) => (
            <tr key={v.id}>
              <td>{v.make} {v.model}</td>
              <td>{v.reg}</td>
              <td>{v.branch}</td>
              <td>{v.customer || '—'}</td>
              <td><StatusChip status={v.status} /></td>
              <td><StatusChip status={v.condition} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
