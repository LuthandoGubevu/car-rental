import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  ['/', 'Dashboard'],
  ['/history', 'Inspection History'],
  ['/vehicle', 'Vehicle Details'],
  ['/incident', 'Report an Incident'],
  ['/help', 'Help and Support'],
];

export function CustomerLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">Vehicle Condition Check</div>
        <nav className="app-nav">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-user">
          <span>{profile?.name}</span>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
