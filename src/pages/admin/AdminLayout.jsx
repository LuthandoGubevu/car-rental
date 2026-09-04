import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listIncidents } from '../../lib/firestore';

const NAV = [
  ['/admin', 'Overview'],
  ['/admin/fleet-status', 'Fleet Status'],
  ['/admin/vehicles', 'Vehicles'],
  ['/admin/incidents', 'Incidents'],
  ['/admin/settings', 'Company settings'],
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function useCrumbLeaf() {
  const { pathname } = useLocation();
  if (pathname === '/admin') return 'Overview';
  const match = NAV.find(([to]) => to !== '/admin' && pathname.startsWith(to));
  return match ? match[1] : 'Overview';
}

function useAdminCounts(companyId) {
  const [counts, setCounts] = useState({ openIncidents: 0 });
  useEffect(() => {
    if (!companyId) return;
    listIncidents(companyId).then((incs) =>
      setCounts({ openIncidents: incs.filter((i) => i.status === 'Logged').length })
    );
  }, [companyId]);
  return counts;
}

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { openIncidents } = useAdminCounts(profile?.companyId);
  const badges = { '/admin/incidents': openIncidents };
  const crumbLeaf = useCrumbLeaf();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img src="/favicon.svg" alt="" />
          <div>
            <div className="sidebar-brand-name">Car Care</div>
            <div className="sidebar-brand-sub">Fleet console</div>
          </div>
        </div>

        <div className="sidebar-group">Operations</div>
        <nav className="app-nav">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <span className="nav-link-label"><span>{label}</span></span>
              {badges[to] > 0 && <span className="nav-badge">{badges[to]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link to="/" className="sidebar-link">Public site · Book a demo</Link>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(profile?.name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-user-name">{profile?.name}</div>
              <div className="sidebar-user-role">Fleet administrator</div>
            </div>
            <button className="sidebar-signout" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="app-header">
          <div className="crumb">
            <span>Fleet console</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-leaf">{crumbLeaf}</span>
          </div>
          <div className="header-spacer" />
        </header>
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}
