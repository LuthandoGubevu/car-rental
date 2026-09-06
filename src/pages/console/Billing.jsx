import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsoleData } from '../../context/ConsoleDataContext';
import { listInvoicesForPeriod } from '../../lib/firestore';
import { billableVehicles, amountOwed, FLAT_RATE_PER_VEHICLE } from '../../lib/pricing';
import { StatusChip } from '../../components/StatusChip';
import { PaymentLinkDrawer } from '../../components/PaymentLinkDrawer';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function sameMonth(date, ref) {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function currentPeriodKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatRand(n) {
  return `R${n.toLocaleString('en-ZA')}`;
}

const INVOICE_STATUS_LABEL = { paid: 'Paid', pending: 'Pending', failed: 'Failed', failed_final: 'Failed' };

export function Billing() {
  const { companies, vehicles, submissions, error, refresh: refreshConsoleData } = useConsoleData();
  const [invoices, setInvoices] = useState([]);
  const [linkCompany, setLinkCompany] = useState(null);
  const [toast, flash] = useFlash();

  function refreshInvoices() {
    listInvoicesForPeriod(currentPeriodKey()).then(setInvoices).catch(() => flash('We could not load invoices.', 'error'));
  }

  useEffect(refreshInvoices, [flash]);
  useEffect(() => {
    if (error) flash(error, 'error');
  }, [error, flash]);

  function refresh() {
    refreshConsoleData();
    refreshInvoices();
  }

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

  const invoiceByCompany = invoices.reduce((map, inv) => {
    if (inv.companyId) map[inv.companyId] = inv;
    return map;
  }, {});

  const rows = companies.map((c) => {
    const companyVehicles = vehiclesByCompany[c.id] || [];
    const invoice = invoiceByCompany[c.id];
    const billable = billableVehicles(companyVehicles).length;
    return {
      id: c.id,
      name: c.name,
      billingStatus: c.billingStatus,
      hasContactEmail: Boolean(c.contactEmail),
      billable,
      reviewed: reviewedByCompany[c.id] || 0,
      owed: invoice ? invoice.amount : amountOwed(companyVehicles),
      statusLabel: invoice
        ? INVOICE_STATUS_LABEL[invoice.status] || 'Pending'
        : c.billingStatus === 'no_payment_method' || !c.billingStatus
          ? 'No card on file'
          : 'Estimate',
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ billable: acc.billable + r.billable, reviewed: acc.reviewed + r.reviewed, owed: acc.owed + r.owed }),
    { billable: 0, reviewed: 0, owed: 0 }
  );

  return (
    <div className="page">
      <h1>Billing</h1>
      <p className="page-sub">Monthly billing per company, at R{FLAT_RATE_PER_VEHICLE} per vehicle</p>

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Company</th><th>Vehicles</th><th>Reviewed this month</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/console/companies/${r.id}`}>{r.name}</Link></td>
                <td>{r.billable}</td>
                <td>{r.reviewed}</td>
                <td>{formatRand(r.owed)}</td>
                <td><StatusChip status={r.statusLabel} /></td>
                <td>
                  {(r.billingStatus === 'no_payment_method' || !r.billingStatus) && (
                    r.hasContactEmail ? (
                      <button className="btn-row-action" onClick={() => setLinkCompany({ id: r.id, name: r.name })}>
                        Send payment link
                      </button>
                    ) : (
                      <button
                        className="btn-row-action"
                        disabled
                        title="This company has no contact email on file yet. Their admin can add one in Company Settings once they've accepted their invite."
                      >
                        Send payment link
                      </button>
                    )
                  )}
                </td>
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
                <td></td>
                <td></td>
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
        A company with a card on file shows its real invoice for this month. A company without one shows a live
        estimate based on its current fleet instead. A vehicle counts as billable unless it's marked Returned or Sold.
      </p>

      <PaymentLinkDrawer
        company={linkCompany}
        onClose={() => { setLinkCompany(null); refresh(); }}
        onError={(msg) => flash(msg, 'error')}
      />
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
