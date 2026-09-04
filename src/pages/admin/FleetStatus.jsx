import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listVehicles, listSubmissions, updateVehicle, acknowledgeSubmission } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left side' },
  { key: 'rear', label: 'Rear' },
  { key: 'right', label: 'Right side' },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isOverdue(vehicle) {
  const last = vehicle?.lastInspectionAt?.toDate?.();
  if (!last) return true;
  return Date.now() - last.getTime() > THIRTY_DAYS_MS;
}

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function complianceFor(vehicle, submission) {
  if (submission?.status === 'Declined') return { label: 'Attention needed', rank: 0 };
  if (isOverdue(vehicle)) return { label: 'Check overdue', rank: 1 };
  return { label: 'Up to date', rank: 2 };
}

export function FleetStatus() {
  const { user, profile } = useAuth();
  const companyId = profile?.companyId;
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes] = useState({});
  const [busyNote, setBusyNote] = useState(null);
  const [busyAck, setBusyAck] = useState(null);
  const [photosFor, setPhotosFor] = useState(null);
  const [toast, flash] = useFlash();

  function refresh() {
    if (!companyId) return;
    listVehicles(companyId)
      .then((vs) => {
        setVehicles(vs);
        setNotes((prev) => {
          const next = { ...prev };
          vs.forEach((v) => {
            if (next[v.id] === undefined) next[v.id] = v.adminNote || '';
          });
          return next;
        });
      })
      .catch(() => flash('We could not load vehicles.', 'error'));
    listSubmissions(undefined, companyId).then(setSubmissions).catch(() => flash('We could not load submissions.', 'error'));
  }

  useEffect(refresh, [companyId, flash]);

  // listSubmissions orders by createdAt desc, so the first hit per
  // vehicleId is that vehicle's most recent submission.
  const latestByVehicle = {};
  submissions.forEach((s) => {
    if (s.vehicleId && !latestByVehicle[s.vehicleId]) latestByVehicle[s.vehicleId] = s;
  });

  const rows = vehicles
    .map((v) => ({ vehicle: v, submission: latestByVehicle[v.id] || null }))
    .map((r) => ({ ...r, compliance: complianceFor(r.vehicle, r.submission) }))
    .sort((a, b) => a.compliance.rank - b.compliance.rank || (a.vehicle.reg || '').localeCompare(b.vehicle.reg || ''));

  async function saveNote(vehicleId) {
    setBusyNote(vehicleId);
    try {
      await updateVehicle(vehicleId, { adminNote: notes[vehicleId] || '' });
      flash('Note saved.');
    } catch {
      flash('We could not save this note.', 'error');
    } finally {
      setBusyNote(null);
    }
  }

  async function acknowledge(submission) {
    setBusyAck(submission.id);
    try {
      await acknowledgeSubmission(submission.id, profile?.name, user.uid);
      flash(`${submission.ref} acknowledged.`);
      refresh();
    } catch {
      flash('We could not acknowledge this submission.', 'error');
    } finally {
      setBusyAck(null);
    }
  }

  return (
    <div className="page">
      <h1>Fleet Status</h1>
      <p className="page-sub">Where every vehicle in your fleet stands, as checked by the Car Care team</p>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Vehicle</th><th>Reg</th><th>Branch</th><th>Customer</th>
              <th>Last check</th><th>Compliance</th><th>Note</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vehicle: v, submission: s, compliance }) => (
              <tr key={v.id}>
                <td>{v.make} {v.model}</td>
                <td>{v.reg}</td>
                <td className="dim">{v.branch}</td>
                <td>{v.customer || '—'}</td>
                <td className="dim">
                  {s ? `${formatDate(s.createdAt)} · ` : ''}
                  <StatusChip status={s ? s.status : 'Not yet assessed'} />
                </td>
                <td><StatusChip status={compliance.label} /></td>
                <td>
                  <input
                    value={notes[v.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    onBlur={() => {
                      if ((notes[v.id] || '') !== (v.adminNote || '')) saveNote(v.id);
                    }}
                    placeholder="Add a note"
                    style={{ width: '100%' }}
                    disabled={busyNote === v.id}
                  />
                </td>
                <td>
                  {s && <button className="btn-row-action" onClick={() => setPhotosFor(s)}>View photos</button>}
                  {compliance.label === 'Attention needed' && !s.acknowledgedByAdmin && (
                    <button className="btn-row-action" disabled={busyAck === s.id} onClick={() => acknowledge(s)}>
                      {busyAck === s.id ? 'Acknowledging…' : 'Acknowledge'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">No vehicles yet</div>
            <div className="table-empty-body">Vehicles the Car Care team onboards will appear here.</div>
          </div>
        )}
      </div>

      {photosFor && (
        <div className="drawer-backdrop">
          <div className="drawer-scrim" onClick={() => setPhotosFor(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="drawer-eyebrow">{photosFor.ref}</div>
                <h2 className="drawer-title">{photosFor.vehicle} · {photosFor.reg}</h2>
                <p className="drawer-meta">{photosFor.customer} · {photosFor.branch} · {formatDate(photosFor.createdAt)}</p>
              </div>
              <button className="drawer-close" onClick={() => setPhotosFor(null)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-body">
              <div className="review-grid">
                {ANGLES.map((angle) => (
                  <div className="review-photo" key={angle.key}>
                    {photosFor.photos?.[angle.key] ? (
                      <img src={photosFor.photos[angle.key]} alt={angle.label} />
                    ) : (
                      <div className="review-photo-placeholder" />
                    )}
                    <span>{angle.label}</span>
                  </div>
                ))}
              </div>
              {photosFor.damage ? (
                <div className="damage-summary">
                  <strong>Damage reported</strong>
                  {photosFor.damage.type} — {photosFor.damage.area || 'area not specified'}
                  <p>{photosFor.damage.description}</p>
                </div>
              ) : (
                <div className="damage-summary neutral">
                  <strong>No damage reported</strong>
                </div>
              )}
              {photosFor.status !== 'Awaiting Review' && (
                <div className="verdict-note">
                  <strong>Reviewed by {photosFor.reviewedBy || '—'} · {photosFor.verdict === 'approved' ? 'Approved' : 'Declined'}</strong>
                  {photosFor.verdict === 'declined' && (
                    <p>
                      {(photosFor.declineReasons || []).join(' · ')}
                      {photosFor.declineNotes ? ` — ${photosFor.declineNotes}` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
