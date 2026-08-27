import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ role, children }) {
  const { user, role: userRole, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/'} replace />;
  }
  return children;
}
