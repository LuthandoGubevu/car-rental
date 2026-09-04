import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listCompanies, listAllVehicles, createCompany, createInvite, updateCompany, listCompanyInvites } from '../../lib/firestore';
import { StatusChip } from '../../components/StatusChip';
import { InviteLinkDrawer } from '../../components/InviteLinkDrawer';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const STATUSES = ['active', 'trial', 'inactive'];
const STATUS_LABEL = { active: 'Active', trial: 'Trial', inactive: 'Inactive' };

const EMPTY_DRAFT = { name: '', adminEmail: '', tier: '', branches: '' };

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState(null);
  const [invite, setInvite] = useState(null);
  const [toast, flash] = useFlash();

  function refresh() {
    listCompanies().then(setCompanies).catch(() => flash('We could not load companies.', 'error'));
    listAllVehicles().then(setVehicles).catch(() => flash('We could not load vehicles.', 'error'));
  }

  useEffect(refresh, [flash]);

  const vehicleCounts = vehicles.reduce((counts, v) => {
    if (v.companyId) counts[v.companyId] = (counts[v.companyId] || 0) + 1;
    return counts;
  }, {});

  const filtered = companies.filter((c) => {
    const matchesStatus = statusFilter === 'All statuses' || c.status === statusFilter;
    const haystack = `${c.name} ${c.contactName || ''} ${c.contactEmail || ''}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  async function handleAdd(e) {
    e.preventDefault();
    if (!draft.name.trim() || !draft.adminEmail.trim()) return;
    setBusy(true);
    try {
      const companyRef = await createCompany(
        {
          name: draft.name.trim(),
          tier: draft.tier.trim(),
          branches: draft.branches.split(',').map((b) => b.trim()).filter(Boolean),
        },
        user.uid
      );
      const inviteId = await createInvite(
        { role: 'admin', companyId: companyRef.id, companyName: draft.name.trim(), email: draft.adminEmail },
        user.uid
      );
      setDraft(EMPTY_DRAFT);
      setFormOpen(false);
      refresh();
      flash('Company created.');
      setInvite({
        link: `${window.location.origin}/accept-invite/${inviteId}`,
        label: `Admin invite for ${draft.name.trim()}`,
        roleLabel: 'Admin',
      });
    } catch {
      flash('We could not create this company.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(company, status) {
    setBusyRow(company.id);
    try {
      await updateCompany(company.id, { status });
      flash(`${company.name} marked ${STATUS_LABEL[status].toLowerCase()}.`);
      refresh();
    } catch {
      flash('We could not update this company.', 'error');
    } finally {
      setBusyRow(null);
    }
  }

  async function copyPendingInvite(company) {
    setBusyRow(company.id);
    try {
      const invites = await listCompanyInvites(company.id);
      const pending = invites.find((i) => i.role === 'admin' && i.status === 'pending');
      if (!pending) {
        flash('No pending admin invite found for this company.', 'error');
        return;
      }
      setInvite({
        link: `${window.location.origin}/accept-invite/${pending.id}`,
        label: `Admin invite for ${company.name}`,
        roleLabel: 'Admin',
      });
    } catch {
      flash('We could not look up this invite.', 'error');
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <div className="page">
      <h1>Companies</h1>
      <div className="toolbar">
        <div className="search-field">
          <span>⌕</span>
          <input placeholder="Search company or contact" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <div className="toolbar-spacer" />
        <button className="btn-primary" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : 'Add company'}</button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} className="card form-grid">
          <div className="form-field"><label>Company name</label><input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></div>
          <div className="form-field"><label>Primary admin email</label><input type="email" value={draft.adminEmail} onChange={(e) => setDraft((d) => ({ ...d, adminEmail: e.target.value }))} /></div>
          <div className="form-field"><label>Tier <span className="optional">optional</span></label><input value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value }))} placeholder="e.g. Starter" /></div>
          <div className="form-field"><label>Branches <span className="optional">optional</span></label><input value={draft.branches} onChange={(e) => setDraft((d) => ({ ...d, branches: e.target.value }))} placeholder="Johannesburg, Cape Town" /></div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create company'}</button>
        </form>
      )}

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Company</th><th>Primary contact</th><th>Vehicles</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/console/companies/${c.id}`}>{c.name}</Link></td>
                <td className="dim">{c.primaryAdminUid ? (c.contactEmail || c.contactName || '—') : 'Invite pending'}</td>
                <td>{vehicleCounts[c.id] || 0}</td>
                <td><StatusChip status={STATUS_LABEL[c.status] || c.status} /></td>
                <td className="dim">{formatDate(c.createdAt)}</td>
                <td>
                  <Link to={`/console/companies/${c.id}`} className="btn-row-action btn-inline">Manage</Link>
                  {!c.primaryAdminUid && (
                    <button className="btn-row-action" disabled={busyRow === c.id} onClick={() => copyPendingInvite(c)}>Copy invite link</button>
                  )}
                  {c.status === 'active' && (
                    <button className="btn-row-action" disabled={busyRow === c.id} onClick={() => changeStatus(c, 'inactive')}>Mark inactive</button>
                  )}
                  {c.status === 'inactive' && (
                    <button className="btn-row-action" disabled={busyRow === c.id} onClick={() => changeStatus(c, 'active')}>Reactivate</button>
                  )}
                  {c.status === 'trial' && (
                    <button className="btn-row-action" disabled={busyRow === c.id} onClick={() => changeStatus(c, 'active')}>Mark active</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">{companies.length === 0 ? 'No companies yet' : 'No companies match that search'}</div>
            <div className="table-empty-body">
              {companies.length === 0 ? 'Add your first company to invite their admin.' : 'Try a company or contact name.'}
            </div>
          </div>
        )}
      </div>
      <InviteLinkDrawer invite={invite} onClose={() => setInvite(null)} />
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
