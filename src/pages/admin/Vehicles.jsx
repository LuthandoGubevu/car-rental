import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listVehicles, deactivateVehicle } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const STATUSES = ['Active Lease', 'Available', 'Inspection Due', 'Under Review', 'Maintenance', 'Accident Repair', 'Returned', 'Sold'];

export function Vehicles() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId;
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [endingVehicle, setEndingVehicle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  useEffect(() => {
    if (companyId) listVehicles(companyId).then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
  }, [companyId, flash]);

  const filtered = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All statuses' || v.status === statusFilter;
    const haystack = `${v.make} ${v.model} ${v.reg} ${v.customer || ''}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  async function handleEndLease(reason) {
    setBusy(true);
    try {
      await deactivateVehicle(endingVehicle.id, reason, profile?.name, user.uid);
      setVehicles((prev) => prev.map((v) => (v.id === endingVehicle.id ? { ...v, status: 'Returned', leaseEndReason: reason } : v)));
      flash('Lease ended. FleetCare staff will follow up on the vehicle’s return.');
      setEndingVehicle(null);
    } catch {
      flash('We could not end this lease. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Vehicles</h1>
      <p className="page-sub">Your fleet, as maintained by the FleetCare team</p>
      <div className="toolbar">
        <div className="search-field">
          <span>⌕</span>
          <input placeholder="Search make, model, reg or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Vehicle</th><th>Reg</th><th>Branch</th><th>Customer</th><th>Status</th><th>Condition</th><th></th></tr></thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id}>
                <td>{v.make} {v.model}</td>
                <td>{v.reg}</td>
                <td className="dim">{v.branch}</td>
                <td>{v.customer || '—'}</td>
                <td><StatusChip status={v.status} /></td>
                <td><StatusChip status={v.condition} /></td>
                <td>
                  {v.status === 'Active Lease' && (
                    <button className="btn-row-action" onClick={() => setEndingVehicle(v)}>End lease</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">No vehicles match that search</div>
            <div className="table-empty-body">Try a registration, make or customer name.</div>
          </div>
        )}
      </div>

      {endingVehicle && (
        <div className="drawer-backdrop">
          <div className="drawer-scrim" onClick={() => setEndingVehicle(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="drawer-eyebrow">{endingVehicle.reg}</div>
                <h2 className="drawer-title">End this lease</h2>
                <p className="drawer-meta">{endingVehicle.make} {endingVehicle.model} · {endingVehicle.customer || 'No customer on file'}</p>
              </div>
              <button className="drawer-close" onClick={() => setEndingVehicle(null)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-body">
              <p className="muted">Choose why this lease is ending. FleetCare staff will follow up to confirm the vehicle's return.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                <button className="btn-primary btn-block" disabled={busy} onClick={() => handleEndLease('Completed')}>Contract completed</button>
                <button className="btn-danger btn-block" disabled={busy} onClick={() => handleEndLease('Broken')}>Contract broken</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
