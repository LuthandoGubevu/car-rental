import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listCompanies, listAllVehicles, listAllSubmissions, listDemoRequests } from '../lib/firestore';

const ConsoleDataContext = createContext(null);

// Staff console pages (Overview, Companies, Billing, the company workspace)
// all need the same business-wide companies/vehicles/submissions/demoRequests
// lists. Fetching them once here, shared via context, avoids each page (and
// the layouts wrapping them) independently re-fetching the same collections
// on every /console/* navigation.
export function ConsoleDataProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [c, v, s, d] = await Promise.allSettled([
      listCompanies(),
      listAllVehicles(),
      listAllSubmissions(),
      listDemoRequests(),
    ]);
    if (c.status === 'fulfilled') setCompanies(c.value);
    if (v.status === 'fulfilled') setVehicles(v.value);
    if (s.status === 'fulfilled') setSubmissions(s.value);
    if (d.status === 'fulfilled') setDemoRequests(d.value);
    setError([c, v, s, d].some((r) => r.status === 'rejected') ? 'We could not load some console data.' : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ConsoleDataContext.Provider value={{ companies, vehicles, submissions, demoRequests, loading, error, refresh }}>
      {children}
    </ConsoleDataContext.Provider>
  );
}

export function useConsoleData() {
  const ctx = useContext(ConsoleDataContext);
  if (!ctx) throw new Error('useConsoleData must be used within a ConsoleDataProvider');
  return ctx;
}
