import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCompanies, listDemoRequests, listAllVehicles } from '../../lib/firestore';
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

function weekBuckets(items) {
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
  items.forEach((item) => {
    const created = item.createdAt?.toDate?.();
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

export function ConsoleOverview() {
  const [companies, setCompanies] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [toast, flash] = useFlash();

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => flash('We could not load companies.', 'error'));
    listDemoRequests().then(setDemoRequests).catch(() => flash('We could not load demo requests.', 'error'));
    listAllVehicles().then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
  }, [flash]);

  const newDemoRequests = demoRequests.filter((r) => r.status === 'New');
  const oldestNew = newDemoRequests
    .map((r) => r.createdAt?.toDate?.())
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  const oldestDays = oldestNew ? daysSince(oldestNew) : null;

  const trialCompanies = companies.filter((c) => c.status === 'trial');
  const activeCompanies = companies.filter((c) => c.status === 'active');

  const now = new Date();
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const companiesThisMonth = companies.filter((c) => {
    const d = c.createdAt?.toDate?.();
    return d && sameMonth(d, now);
  }).length;
  const companiesLastMonth = companies.filter((c) => {
    const d = c.createdAt?.toDate?.();
    return d && sameMonth(d, lastMonthRef);
  }).length;

  const companyIdsWithVehicles = new Set(vehicles.map((v) => v.companyId).filter(Boolean));
  const idleCompanies = companies.filter((c) => !companyIdsWithVehicles.has(c.id));

  const KPIS = [
    {
      label: 'New demo requests',
      value: newDemoRequests.length,
      unit: 'to contact',
      accent: '#f47724',
      tag: newDemoRequests.length > 0 && oldestDays !== null ? `Oldest ${oldestDays} day${oldestDays === 1 ? '' : 's'}` : null,
      frac: clamp01(demoRequests.length ? newDemoRequests.length / demoRequests.length : 0),
    },
    {
      label: 'Companies on the platform',
      value: companies.length,
      unit: 'companies',
      accent: '#00507f',
      tag: trialCompanies.length > 0 ? `${trialCompanies.length} in trial` : null,
      frac: clamp01(companies.length ? activeCompanies.length / companies.length : 0),
    },
    {
      label: 'New companies this month',
      value: companiesThisMonth,
      unit: 'signed up',
      accent: '#22a35a',
      tag:
        companiesLastMonth && companiesLastMonth !== companiesThisMonth
          ? companiesThisMonth < companiesLastMonth
            ? `Down from ${companiesLastMonth}`
            : `Up from ${companiesLastMonth}`
          : null,
      frac: clamp01(companies.length ? companiesThisMonth / companies.length : 0),
    },
    {
      label: 'Vehicles under management',
      value: vehicles.length,
      unit: 'vehicles',
      accent: '#8b5cf6',
      tag:
        companyIdsWithVehicles.size > 0
          ? `${companyIdsWithVehicles.size} compan${companyIdsWithVehicles.size === 1 ? 'y' : 'ies'} reporting`
          : null,
      frac: clamp01(companies.length ? companyIdsWithVehicles.size / companies.length : 0),
    },
  ];

  const weeks = weekBuckets(demoRequests);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));
  const recentTotal = weeks.reduce((sum, w) => sum + w.count, 0);

  const attentionRows = [
    newDemoRequests.length > 0 && {
      to: '/console/demo-requests',
      dot: '#f47724',
      title: `${newDemoRequests.length} new demo request${newDemoRequests.length === 1 ? '' : 's'}`,
      sub: 'Demo requests · from the public site',
    },
    trialCompanies.length > 0 && {
      to: '/console/companies',
      dot: '#d99a2b',
      title: `${trialCompanies.length} compan${trialCompanies.length === 1 ? 'y' : 'ies'} on trial`,
      sub: 'Companies · convert before their trial ends',
    },
    idleCompanies.length > 0 && {
      to: '/console/companies',
      dot: '#3b6fd4',
      title: `${idleCompanies.length} compan${idleCompanies.length === 1 ? 'y' : 'ies'} with no vehicles yet`,
      sub: 'Companies · onboarded but not yet active',
    },
  ].filter(Boolean);

  return (
    <div className="page">
      <div className="vehicle-card-top">
        <div>
          <h1>Overview</h1>
          <p className="page-sub">FleetCare, at a glance</p>
        </div>
        <Link to="/console/companies" className="btn-primary">Add a company</Link>
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
            <h2>Demo requests, last 8 weeks</h2>
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
              <Link key={`${row.to}-${row.title}`} to={row.to} className="attention-row">
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
