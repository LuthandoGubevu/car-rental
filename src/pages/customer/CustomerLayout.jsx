import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  ['/dashboard', 'Dashboard'],
  ['/dashboard/history', 'Inspection History'],
  ['/dashboard/vehicle', 'Vehicle Details'],
  ['/dashboard/incident', 'Report an Incident'],
  ['/dashboard/help', 'Help and Support'],
];

export function CustomerLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">Car Care</div>
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
