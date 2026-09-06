import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCompanies, listAllVehicles, listAllSubmissions } from '../../lib/firestore';
import { billableVehicles, amountOwed, FLAT_RATE_PER_VEHICLE } from '../../lib/pricing';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function sameMonth(date, ref) {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function formatRand(n) {
  return `R${n.toLocaleString('en-ZA')}`;
}

export function Billing() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [toast, flash] = useFlash();

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => flash('We could not load companies.', 'error'));
    listAllVehicles().then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
    listAllSubmissions().then(setSubmissions).catch(() => flash('We could not load submissions.', 'error'));
  }, [flash]);

  const vehiclesByCompany = vehicles.reduce((groups, v) => {
    if (v.companyId) (groups[v.companyId] ||= []).push(v);
    return groups;
  }, {});

  const now = new Date();
  const reviewedByCompany = submissions.reduce((counts, s) => {
    if (s.status === 'Awaiting Review') return counts;
    const d = s.reviewedAt?.toDate?.();
    if (!d || !sameMonth(d, now)) return counts;
    if (s.companyId) counts[s.companyId] = (counts[s.companyId] || 0) + 1;
    return counts;
  }, {});

  const rows = companies.map((c) => {
    const companyVehicles = vehiclesByCompany[c.id] || [];
    return {
      id: c.id,
      name: c.name,
      billable: billableVehicles(companyVehicles).length,
      reviewed: reviewedByCompany[c.id] || 0,
      owed: amountOwed(companyVehicles),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ billable: acc.billable + r.billable, reviewed: acc.reviewed + r.reviewed, owed: acc.owed + r.owed }),
    { billable: 0, reviewed: 0, owed: 0 }
  );

  return (
    <div className="page">
      <h1>Billing</h1>
      <p className="page-sub">Estimated monthly billing per company, at R{FLAT_RATE_PER_VEHICLE} per vehicle</p>

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Company</th><th>Vehicles</th><th>Reviewed this month</th><th>Est. owed this month</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/console/companies/${r.id}`}>{r.name}</Link></td>
                <td>{r.billable}</td>
                <td>{r.reviewed}</td>
                <td>{formatRand(r.owed)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{totals.billable}</strong></td>
                <td><strong>{totals.reviewed}</strong></td>
                <td><strong>{formatRand(totals.owed)}</strong></td>
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">No companies yet</div>
            <div className="table-empty-body">Billing figures will appear here once a company has vehicles on file.</div>
          </div>
        )}
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        This is a live estimate based on each company's current fleet, not a saved invoice. A vehicle counts as
        billable unless it's marked Returned or Sold. No payment status is tracked here yet.
      </p>

      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
