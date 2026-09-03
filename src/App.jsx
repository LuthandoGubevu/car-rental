import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AcceptInvite } from './pages/AcceptInvite';
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
import { Incidents } from './pages/admin/Incidents';
import { Drivers } from './pages/admin/Drivers';
import { Team } from './pages/admin/Team';
import { ConsoleLayout } from './pages/console/ConsoleLayout';
import { ConsoleOverview } from './pages/console/ConsoleOverview';
import { Companies } from './pages/console/Companies';
import { DemoRequests } from './pages/console/DemoRequests';
import { Privacy } from './pages/legal/Privacy';
import { Terms } from './pages/legal/Terms';
import { Popia } from './pages/legal/Popia';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite/:inviteId" element={<AcceptInvite />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/popia" element={<Popia />} />

      <Route path="/dashboard" element={<ProtectedRoute role="driver"><CustomerLayout /></ProtectedRoute>}>
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
        <Route path="incidents" element={<Incidents />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="team" element={<Team />} />
      </Route>

      <Route path="/console" element={<ProtectedRoute role="staff"><ConsoleLayout /></ProtectedRoute>}>
        <Route index element={<ConsoleOverview />} />
        <Route path="companies" element={<Companies />} />
        <Route path="demo-requests" element={<DemoRequests />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
