import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ConsoleDataProvider } from './context/ConsoleDataContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AcceptInvite } from './pages/AcceptInvite';
import { BillingConfirmation } from './pages/BillingConfirmation';
import { Privacy } from './pages/legal/Privacy';
import { Terms } from './pages/legal/Terms';
import { Popia } from './pages/legal/Popia';

// Each of these role-scoped trees (driver / admin / staff console / company
// workspace) is only ever visited by one kind of user in a session, so they
// don't need to be in the same bundle as the public landing/auth pages that
// every visitor loads first.
const CustomerLayout = lazy(() => import('./pages/customer/CustomerLayout').then((m) => ({ default: m.CustomerLayout })));
const Dashboard = lazy(() => import('./pages/customer/Dashboard').then((m) => ({ default: m.Dashboard })));
const VehicleCheck = lazy(() => import('./pages/customer/VehicleCheck').then((m) => ({ default: m.VehicleCheck })));
const History = lazy(() => import('./pages/customer/History').then((m) => ({ default: m.History })));
const VehicleDetails = lazy(() => import('./pages/customer/VehicleDetails').then((m) => ({ default: m.VehicleDetails })));
const ReportIncident = lazy(() => import('./pages/customer/ReportIncident').then((m) => ({ default: m.ReportIncident })));
const Help = lazy(() => import('./pages/customer/Help').then((m) => ({ default: m.Help })));
const Notifications = lazy(() => import('./pages/customer/Notifications').then((m) => ({ default: m.Notifications })));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const Overview = lazy(() => import('./pages/admin/Overview').then((m) => ({ default: m.Overview })));
const Vehicles = lazy(() => import('./pages/admin/Vehicles').then((m) => ({ default: m.Vehicles })));
const Incidents = lazy(() => import('./pages/admin/Incidents').then((m) => ({ default: m.Incidents })));
const FleetStatus = lazy(() => import('./pages/admin/FleetStatus').then((m) => ({ default: m.FleetStatus })));
const CompanySettings = lazy(() => import('./pages/admin/CompanySettings').then((m) => ({ default: m.CompanySettings })));

const ConsoleLayout = lazy(() => import('./pages/console/ConsoleLayout').then((m) => ({ default: m.ConsoleLayout })));
const ConsoleOverview = lazy(() => import('./pages/console/ConsoleOverview').then((m) => ({ default: m.ConsoleOverview })));
const Companies = lazy(() => import('./pages/console/Companies').then((m) => ({ default: m.Companies })));
const Billing = lazy(() => import('./pages/console/Billing').then((m) => ({ default: m.Billing })));
const DemoRequests = lazy(() => import('./pages/console/DemoRequests').then((m) => ({ default: m.DemoRequests })));

const CompanyWorkspaceLayout = lazy(() =>
  import('./pages/console/company/CompanyWorkspaceLayout').then((m) => ({ default: m.CompanyWorkspaceLayout }))
);
const CompanyOverview = lazy(() => import('./pages/console/company/Overview').then((m) => ({ default: m.Overview })));
const CompanyVehicles = lazy(() => import('./pages/console/company/Vehicles').then((m) => ({ default: m.Vehicles })));
const CompanyReviewQueue = lazy(() => import('./pages/console/company/ReviewQueue').then((m) => ({ default: m.ReviewQueue })));
const CompanyOutcomes = lazy(() => import('./pages/console/company/Outcomes').then((m) => ({ default: m.Outcomes })));
const CompanyIncidents = lazy(() => import('./pages/console/company/Incidents').then((m) => ({ default: m.Incidents })));
const CompanyDrivers = lazy(() => import('./pages/console/company/Drivers').then((m) => ({ default: m.Drivers })));
const CompanyTeam = lazy(() => import('./pages/console/company/Team').then((m) => ({ default: m.Team })));

export default function App() {
  return (
    <Suspense fallback={<div className="page-loading">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite/:inviteId" element={<AcceptInvite />} />
        <Route path="/billing-confirmation" element={<BillingConfirmation />} />
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
          <Route path="fleet-status" element={<FleetStatus />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="settings" element={<CompanySettings />} />
        </Route>

        <Route element={<ConsoleDataProvider><Outlet /></ConsoleDataProvider>}>
          <Route path="/console" element={<ProtectedRoute role="staff"><ConsoleLayout /></ProtectedRoute>}>
            <Route index element={<ConsoleOverview />} />
            <Route path="companies" element={<Companies />} />
            <Route path="billing" element={<Billing />} />
            <Route path="demo-requests" element={<DemoRequests />} />
          </Route>

          <Route path="/console/companies/:companyId" element={<ProtectedRoute role="staff"><CompanyWorkspaceLayout /></ProtectedRoute>}>
            <Route index element={<CompanyOverview />} />
            <Route path="vehicles" element={<CompanyVehicles />} />
            <Route path="queue" element={<CompanyReviewQueue />} />
            <Route path="outcomes" element={<CompanyOutcomes />} />
            <Route path="incidents" element={<CompanyIncidents />} />
            <Route path="drivers" element={<CompanyDrivers />} />
            <Route path="team" element={<CompanyTeam />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
