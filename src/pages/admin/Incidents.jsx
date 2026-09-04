import { useEffect, useState } from 'react';
import { listIncidents, acknowledgeIncident } from '../../lib/firestore';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Incidents() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId;
  const [tab, setTab] = useState('open');
  const [incidents, setIncidents] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, flash] = useFlash();

  function refresh() {
    if (companyId) listIncidents(companyId).then(setIncidents);
  }

  useEffect(refresh, [companyId]);

  const openIncidents = incidents.filter((i) => i.status === 'Logged');
  const visible = tab === 'open' ? openIncidents : incidents;

  async function acknowledge(incident) {
    setBusy(incident.id);
    try {
      await acknowledgeIncident(incident.id, profile?.name, user.uid);
      flash(`${incident.ref} acknowledged.`);
      refresh();
    } catch {
      flash('We could not acknowledge this incident.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <h1>Incidents</h1>
      <p className="page-sub">Accident, theft, breakdown and damage reports, reviewed by the Car Care team</p>
      <div className="toolbar">
        <div className="tabs">
          <button className={tab === 'open' ? 'tab active' : 'tab'} onClick={() => setTab('open')}>
            Open <span className="tab-count">{openIncidents.length}</span>
          </button>
          <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
            All incidents <span className="tab-count">{incidents.length}</span>
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Reference</th><th>Vehicle</th><th>Customer</th>
              <th>Type</th><th>Description</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.id}>
                <td>{formatDate(i.createdAt)}</td>
                <td>{i.ref}</td>
                <td>{i.vehicle} · {i.reg}</td>
                <td>{i.customer}</td>
                <td>{i.type}</td>
                <td className="dim">{i.description}</td>
                <td><StatusChip status={i.status} /></td>
                <td>
                  {i.status === 'Logged' && (
                    i.acknowledgedByAdmin ? (
                      <span className="dim">Acknowledged</span>
                    ) : (
                      <button className="btn-row-action" disabled={busy === i.id} onClick={() => acknowledge(i)}>
                        {busy === i.id ? 'Acknowledging…' : 'Acknowledge'}
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">{tab === 'open' ? 'No open incidents' : 'No incidents logged'}</div>
            <div className="table-empty-body">
              {tab === 'open'
                ? 'Every incident has been reviewed by the Car Care team. New reports land here as drivers log them.'
                : 'Reports from drivers will appear here.'}
            </div>
          </div>
        )}
      </div>
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
