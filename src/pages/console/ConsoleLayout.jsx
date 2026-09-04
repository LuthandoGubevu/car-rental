import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listCompanies, listDemoRequests } from '../../lib/firestore';

const NAV = [
  ['/console', 'Overview'],
  ['/console/companies', 'Companies'],
  ['/console/demo-requests', 'Demo requests'],
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
  if (pathname === '/console') return 'Overview';
  const match = NAV.find(([to]) => to !== '/console' && pathname.startsWith(to));
  return match ? match[1] : 'Overview';
}

function useConsoleCounts() {
  const [counts, setCounts] = useState({ newDemoRequests: 0 });
  useEffect(() => {
    Promise.all([listCompanies(), listDemoRequests()]).then(([, demoRequests]) =>
      setCounts({ newDemoRequests: demoRequests.filter((r) => r.status === 'New').length })
    );
  }, []);
  return counts;
}

export function ConsoleLayout() {
  const { profile, signOut } = useAuth();
  const { newDemoRequests } = useConsoleCounts();
  const badges = { '/console/demo-requests': newDemoRequests };
  const crumbLeaf = useCrumbLeaf();

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

        <div className="sidebar-group">Business</div>
        <nav className="app-nav">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <span className="nav-link-label"><span>{label}</span></span>
              {badges[to] > 0 && <span className="nav-badge">{badges[to]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
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
            <span className="crumb-leaf">{crumbLeaf}</span>
          </div>
          <div className="header-spacer" />
        </header>
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}
