import { useEffect, useState } from 'react';
import { listSubmissions, recordVerdict } from '../../lib/firestore';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const DECLINE_REASONS = [
  'Photo is blurry or unclear',
  'Wrong angle — vehicle not fully in frame',
  "Photo doesn't match the vehicle on record",
  'Missing one or more required photos',
  'Other',
];

const ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left side' },
  { key: 'rear', label: 'Rear' },
  { key: 'right', label: 'Right side' },
];

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReviewQueue() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('open');
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useFlash();

  const companyId = profile?.companyId;

  function refresh() {
    if (companyId) listSubmissions(undefined, companyId).then(setSubmissions);
  }

  useEffect(refresh, [companyId]);

  const awaitingSubs = submissions.filter((s) => s.status === 'Awaiting Review');
  const visible = tab === 'open' ? awaitingSubs : submissions;

  function open(submission) {
    setSelected(submission);
    setDeclining(false);
    setReasons([]);
    setNotes('');
  }

  function close() {
    setSelected(null);
  }

  useEffect(() => {
    if (!selected) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  function toggleReason(reason) {
    setReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]));
  }

  async function decide(verdict) {
    setBusy(true);
    try {
      await recordVerdict(selected.id, {
        verdict,
        reviewedBy: profile?.name,
        declineReasons: verdict === 'declined' ? reasons : undefined,
        declineNotes: verdict === 'declined' ? notes : undefined,
      });
      flash(
        verdict === 'approved'
          ? `${selected.ref} approved.`
          : `${selected.ref} declined — feedback sent to ${selected.customer}.`
      );
      setSelected(null);
      refresh();
    } catch {
      flash('We could not record this verdict.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Review Queue</h1>
      <div className="toolbar">
        <div className="tabs">
          <button className={tab === 'open' ? 'tab active' : 'tab'} onClick={() => setTab('open')}>
            Awaiting review <span className="tab-count">{awaitingSubs.length}</span>
          </button>
          <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
            All submissions <span className="tab-count">{submissions.length}</span>
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Date</th><th>Reference</th><th>Vehicle</th><th>Customer</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.createdAt)}</td>
                <td>{s.ref}</td>
                <td>{s.vehicle} · {s.reg}</td>
                <td>{s.customer}</td>
                <td><StatusChip status={s.status} /></td>
                <td><button className="btn-row-action" onClick={() => open(s)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">{tab === 'open' ? 'Queue is clear' : 'No submissions yet'}</div>
            <div className="table-empty-body">
              {tab === 'open'
                ? 'Every submission has a verdict. New checks land here as drivers submit them.'
                : 'Driver condition checks will appear here once submitted.'}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="drawer-backdrop">
          <div className="drawer-scrim" onClick={close} />
          <div className="drawer">
            <div className="drawer-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="drawer-eyebrow">{selected.ref}</div>
                <h2 className="drawer-title">{selected.vehicle} · {selected.reg}</h2>
                <p className="drawer-meta">{selected.customer} · {selected.branch} · {formatDate(selected.createdAt)}</p>
              </div>
              <button className="drawer-close" onClick={close} aria-label="Close">✕</button>
            </div>

            <div className="drawer-body">
              <div className="review-grid">
                {ANGLES.map((angle) => (
                  <div className="review-photo" key={angle.key}>
                    {selected.photos?.[angle.key] ? (
                      <img src={selected.photos[angle.key]} alt={angle.label} />
                    ) : (
                      <div className="review-photo-placeholder" />
                    )}
                    <span>{angle.label}</span>
                  </div>
                ))}
              </div>

              {selected.damage ? (
                <div className="damage-summary">
                  <strong>Damage reported</strong>
                  {selected.damage.type} — {selected.damage.area || 'area not specified'}
                  <p>{selected.damage.description}</p>
                </div>
              ) : (
                <div className="damage-summary neutral">
                  <strong>No damage reported</strong>
                </div>
              )}

              {selected.status === 'Awaiting Review' && declining && (
                <div className="decline-panel">
                  <p>Tell the driver what needs fixing — this goes back to them so they can resubmit.</p>
                  {DECLINE_REASONS.map((reason) => (
                    <label key={reason} className={reasons.includes(reason) ? 'checkbox-row checked' : 'checkbox-row'}>
                      <input type="checkbox" checked={reasons.includes(reason)} onChange={() => toggleReason(reason)} />
                      {reason}
                    </label>
                  ))}
                  <textarea
                    placeholder="Add any extra detail for the driver (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

              {selected.status !== 'Awaiting Review' && (
                <div className="verdict-note">
                  <strong>Reviewed by {selected.reviewedBy || '—'} · {selected.verdict === 'approved' ? 'Approved' : 'Declined'}</strong>
                  {selected.verdict === 'declined' && (
                    <p>
                      {(selected.declineReasons || []).join(' · ')}
                      {selected.declineNotes ? ` — ${selected.declineNotes}` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selected.status === 'Awaiting Review' && (
              <div className="drawer-foot">
                {declining ? (
                  <>
                    <button className="btn-danger" disabled={busy || (!reasons.length && !notes.trim())} onClick={() => decide('declined')}>
                      {busy ? 'Sending…' : 'Send decline to driver'}
                    </button>
                    <button className="btn-secondary" onClick={() => setDeclining(false)}>Back</button>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" disabled={busy} onClick={() => decide('approved')}>Approve submission</button>
                    <button className="btn-secondary" onClick={() => setDeclining(true)}>Decline with reasons</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
