import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listVehicles, listSubmissions, listIncidents } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function startOfISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function weekBuckets(submissions) {
  const now = new Date();
  const weeks = [];
  const currentWeekStart = startOfISOWeek(now);
  for (let i = 7; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weeks.push({ start, end, count: 0 });
  }
  submissions.forEach((s) => {
    const created = s.createdAt?.toDate?.();
    if (!created) return;
    const bucket = weeks.find((w) => created >= w.start && created < w.end);
    if (bucket) bucket.count += 1;
  });
  return weeks;
}

function weekLabel(date) {
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function sameMonth(date, ref) {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function daysSince(date) {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export function Overview() {
  const { profile } = useAuth();
  const companyId = profile?.companyId;
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [toast, flash] = useFlash();

  useEffect(() => {
    if (!companyId) return;
    listVehicles(companyId).then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
    listSubmissions(undefined, companyId).then(setSubmissions).catch(() => flash('We could not load submissions.', 'error'));
    listIncidents(companyId).then(setIncidents).catch(() => flash('We could not load incidents.', 'error'));
  }, [companyId, flash]);

  const awaitingSubs = submissions.filter((s) => s.status === 'Awaiting Review');
  const awaiting = awaitingSubs.length;
  const oldestAwaiting = awaitingSubs
    .map((s) => s.createdAt?.toDate?.())
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  const oldestDays = oldestAwaiting ? daysSince(oldestAwaiting) : null;

  const activeVehicles = vehicles.filter((v) => v.status === 'Active Lease' || v.status === 'Available').length;
  const branchCount = new Set(vehicles.map((v) => v.branch).filter(Boolean)).size;
  const inspectionDue = vehicles.filter((v) => v.status === 'Inspection Due').length;

  const now = new Date();
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const submissionsThisMonth = submissions.filter((s) => {
    const d = s.createdAt?.toDate?.();
    return d && sameMonth(d, now);
  });
  const declinedThisMonth = submissionsThisMonth.filter((s) => s.status === 'Declined').length;
  const declinedLastMonth = submissions.filter((s) => {
    const d = s.createdAt?.toDate?.();
    return d && sameMonth(d, lastMonthRef) && s.status === 'Declined';
  }).length;

  const unreviewedIncidents = incidents.filter((i) => i.status === 'Logged').length;

  const KPIS = [
    {
      label: 'Awaiting review',
      value: awaiting,
      unit: 'submissions',
      accent: '#f47724',
      tag: awaiting > 0 && oldestDays !== null ? `Oldest ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : null,
      frac: clamp01(vehicles.length ? awaiting / vehicles.length : 0),
    },
    {
      label: 'Vehicles in fleet',
      value: vehicles.length,
      unit: 'active',
      accent: '#00507f',
      tag: branchCount > 0 ? `${branchCount} branch${branchCount === 1 ? '' : 'es'}` : null,
      frac: clamp01(vehicles.length ? activeVehicles / vehicles.length : 0),
    },
    {
      label: 'Declined this month',
      value: declinedThisMonth,
      unit: 'to resubmit',
      accent: '#22a35a',
      tag:
        declinedLastMonth && declinedLastMonth !== declinedThisMonth
          ? declinedThisMonth < declinedLastMonth
            ? `Down from ${declinedLastMonth}`
            : `Up from ${declinedLastMonth}`
          : null,
      frac: clamp01(submissionsThisMonth.length ? declinedThisMonth / submissionsThisMonth.length : 0),
    },
    {
      label: 'Open incidents',
      value: unreviewedIncidents,
      unit: 'logged',
      accent: '#dc2626',
      tag: 'Needs triage',
      frac: clamp01(incidents.length ? unreviewedIncidents / incidents.length : 0),
    },
  ];

  const weeks = weekBuckets(submissions);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));
  const recentTotal = weeks.reduce((sum, w) => sum + w.count, 0);

  const attentionRows = [
    awaiting > 0 && {
      to: '/admin/fleet-status',
      dot: '#f47724',
      title: `${awaiting} submission${awaiting === 1 ? '' : 's'} awaiting a verdict`,
      sub: oldestDays !== null ? `Fleet Status · oldest waiting ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : 'Fleet Status',
    },
    inspectionDue > 0 && {
      to: '/admin/vehicles',
      dot: '#d99a2b',
      title: `${inspectionDue} vehicle${inspectionDue === 1 ? '' : 's'} due for inspection`,
      sub: 'Vehicles · overdue for a monthly check',
    },
    unreviewedIncidents > 0 && {
      to: '/admin/incidents',
      dot: '#dc2626',
      title: `${unreviewedIncidents} incident${unreviewedIncidents === 1 ? '' : 's'} awaiting triage`,
      sub: 'Incidents · reported by drivers',
    },
  ].filter(Boolean);

  return (
    <div className="page">
      <div className="vehicle-card-top">
        <div>
          <h1>Overview</h1>
          <p className="page-sub">Condition checks at a glance</p>
        </div>
        <Link to="/admin/fleet-status" className="btn-primary">View Fleet Status</Link>
      </div>

      <div className="stat-grid">
        {KPIS.map((k) => (
          <div className="stat-card" key={k.label}>
            <div className="stat-head">
              <span className="stat-label">{k.label}</span>
              {k.tag && (
                <span
                  className="stat-tag"
                  style={{ color: k.accent, background: `${k.accent}14`, borderColor: `${k.accent}2b` }}
                >
                  {k.tag}
                </span>
              )}
            </div>
            <div className="stat-figure">
              <span className="stat-value">{k.value}</span>
              <span className="stat-unit">{k.unit}</span>
            </div>
            <div className="stat-track">
              <div className="stat-fill" style={{ width: `${k.frac * 100}%`, background: k.accent }} />
            </div>
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="chart-head">
            <h2>Submissions, last 8 weeks</h2>
            <span>{recentTotal} total</span>
          </div>
          <div className="chart">
            {weeks.map((w, idx) => (
              <div className="chart-col" key={w.start.toISOString()}>
                <span className="chart-value">{w.count}</span>
                <div
                  className={idx === weeks.length - 1 ? 'chart-bar current' : 'chart-bar'}
                  style={{ height: `${(w.count / maxWeek) * 104}px` }}
                />
                <span className="chart-label">{weekLabel(w.start)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Needs attention</h2>
          {attentionRows.length === 0 && <p className="muted">Nothing needs attention right now.</p>}
          <div className="attention-list">
            {attentionRows.map((row) => (
              <Link key={row.to} to={row.to} className="attention-row">
                <span className="attention-dot" style={{ background: row.dot }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="attention-title">{row.title}</span>
                  <span className="attention-sub">{row.sub}</span>
                </span>
                <span className="attention-chevron">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
