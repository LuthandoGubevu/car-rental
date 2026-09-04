import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listVehicles } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const STATUSES = ['Active Lease', 'Available', 'Inspection Due', 'Under Review', 'Maintenance', 'Accident Repair', 'Returned', 'Sold'];

export function Vehicles() {
  const { profile } = useAuth();
  const companyId = profile?.companyId;
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [toast, flash] = useFlash();

  useEffect(() => {
    if (companyId) listVehicles(companyId).then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
  }, [companyId, flash]);

  const filtered = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All statuses' || v.status === statusFilter;
    const haystack = `${v.make} ${v.model} ${v.reg} ${v.customer || ''}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  return (
    <div className="page">
      <h1>Vehicles</h1>
      <p className="page-sub">Your fleet, as maintained by the Car Care team</p>
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
          <thead><tr><th>Vehicle</th><th>Reg</th><th>Branch</th><th>Customer</th><th>Status</th><th>Condition</th></tr></thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id}>
                <td>{v.make} {v.model}</td>
                <td>{v.reg}</td>
                <td className="dim">{v.branch}</td>
                <td>{v.customer || '—'}</td>
                <td><StatusChip status={v.status} /></td>
                <td><StatusChip status={v.condition} /></td>
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
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
