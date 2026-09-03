import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = { driver: '/dashboard', admin: '/admin', staff: '/console' };

export function ProtectedRoute({ role, children }) {
  const { user, profileError, role: userRole, loading, signOut } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  // A denied/failed profile read leaves userRole null - redirecting on that
  // (as the role mismatch below would) can point right back at this same
  // route, so it needs its own dead end with a way out instead of a loop.
  if (profileError) {
    return (
      <div className="page-loading">
        <p>We could not load your account. Please try signing in again.</p>
        <button className="btn-secondary" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  const allowed = !role || (Array.isArray(role) ? role.includes(userRole) : userRole === role);
  if (!allowed) {
    return <Navigate to={ROLE_HOME[userRole] || '/'} replace />;
  }
  return children;
}
