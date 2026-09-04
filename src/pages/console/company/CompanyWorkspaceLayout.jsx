import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getCompany, listCompanies, listSubmissions, listIncidents } from '../../../lib/firestore';

const NAV = [
  ['', 'Overview'],
  ['vehicles', 'Vehicles'],
  ['queue', 'Review queue'],
  ['outcomes', 'Outcomes'],
  ['incidents', 'Incidents'],
  ['drivers', 'Drivers'],
  ['team', 'Team'],
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function useCompanyCounts(companyId) {
  const [counts, setCounts] = useState({ awaiting: 0, openIncidents: 0 });
  useEffect(() => {
    if (!companyId) return;
    Promise.all([listSubmissions(undefined, companyId), listIncidents(companyId)]).then(([subs, incs]) =>
      setCounts({
        awaiting: subs.filter((s) => s.status === 'Awaiting Review').length,
        openIncidents: incs.filter((i) => i.status === 'Logged').length,
      })
    );
  }, [companyId]);
  return counts;
}

export function CompanyWorkspaceLayout() {
  const { companyId } = useParams();
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const { awaiting, openIncidents } = useCompanyCounts(companyId);

  useEffect(() => {
    if (companyId) getCompany(companyId).then(setCompany);
  }, [companyId]);

  useEffect(() => {
    listCompanies().then(setCompanies);
  }, []);

  const base = `/console/companies/${companyId}`;
  const badges = { [`${base}/queue`]: awaiting, [`${base}/incidents`]: openIncidents };

  const crumbLeaf = (() => {
    if (pathname === base) return 'Overview';
    const match = NAV.find(([to]) => to && pathname.startsWith(`${base}/${to}`));
    return match ? match[1] : 'Overview';
  })();

  function switchCompany(newCompanyId) {
    const suffix = pathname.slice(base.length);
    navigate(`/console/companies/${newCompanyId}${suffix}`);
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img src="/favicon.svg" alt="" />
          <div>
            <div className="sidebar-brand-name">Car Care</div>
            <div className="sidebar-brand-sub">Staff console</div>
          </div>
        </div>

        <Link to="/console/companies" className="sidebar-link" style={{ display: 'block', textAlign: 'center', margin: '0 20px 18px' }}>
          ← All companies
        </Link>

        <div className="sidebar-group">{company?.name || 'Company'}</div>
        <nav className="app-nav">
          {NAV.map(([to, label]) => {
            const href = to ? `${base}/${to}` : base;
            return (
              <NavLink key={href} to={href} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <span className="nav-link-label"><span>{label}</span></span>
                {badges[href] > 0 && <span className="nav-badge">{badges[href]}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <Link to="/" className="sidebar-link">Public site · Book a demo</Link>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(profile?.name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-user-name">{profile?.name}</div>
              <div className="sidebar-user-role">Car Care staff</div>
            </div>
            <button className="sidebar-signout" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="app-header">
          <div className="crumb">
            <span>Staff console</span>
            <span className="crumb-sep">/</span>
            <span>{company?.name || '…'}</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-leaf">{crumbLeaf}</span>
          </div>
          <div className="header-spacer" />
          {companies.length > 1 && (
            <select value={companyId} onChange={(e) => switchCompany(e.target.value)} aria-label="Switch company">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </header>
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}
