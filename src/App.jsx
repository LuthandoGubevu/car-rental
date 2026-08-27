import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CustomerLayout } from './pages/customer/CustomerLayout';
import { Dashboard } from './pages/customer/Dashboard';
import { VehicleCheck } from './pages/customer/VehicleCheck';
import { History } from './pages/customer/History';
import { VehicleDetails } from './pages/customer/VehicleDetails';
import { ReportIncident } from './pages/customer/ReportIncident';
import { Help } from './pages/customer/Help';
import { Notifications } from './pages/customer/Notifications';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Overview } from './pages/admin/Overview';
import { Vehicles } from './pages/admin/Vehicles';
import { ReviewQueue } from './pages/admin/ReviewQueue';
import { Outcomes } from './pages/admin/Outcomes';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="check" element={<VehicleCheck />} />
        <Route path="history" element={<History />} />
        <Route path="vehicle" element={<VehicleDetails />} />
        <Route path="incident" element={<ReportIncident />} />
        <Route path="help" element={<Help />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="queue" element={<ReviewQueue />} />
        <Route path="outcomes" element={<Outcomes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
