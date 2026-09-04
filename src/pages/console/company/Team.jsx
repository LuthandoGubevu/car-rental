import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { listCompanyUsers, listCompanyInvites, createInvite, revokeInvite, setUserRole, getCompany } from '../../../lib/firestore';
import { useFlash } from '../../../lib/useFlash';
import { Toast } from '../../../components/Toast';
import { StatusChip } from '../../../components/StatusChip';
import { InviteLinkDrawer } from '../../../components/InviteLinkDrawer';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Team() {
  const { user: currentUser } = useAuth();
  const { companyId } = useParams();
  const [admins, setAdmins] = useState([]);
  const [invites, setInvites] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState(null);
  const [invite, setInvite] = useState(null);
  const [toast, flash] = useFlash();

  function refresh() {
    if (!companyId) return;
    listCompanyUsers(companyId)
      .then((all) => setAdmins(all.filter((m) => m.role === 'admin')))
      .catch(() => flash('We could not load the team.', 'error'));
    listCompanyInvites(companyId)
      .then((all) => setInvites(all.filter((i) => i.status === 'pending' && i.role === 'admin')))
      .catch(() => flash('We could not load invites.', 'error'));
  }

  useEffect(refresh, [companyId, flash]);
  useEffect(() => {
    if (companyId) getCompany(companyId).then((c) => setCompanyName(c?.name || '')).catch((err) => console.error('Could not load company:', err));
  }, [companyId]);

  async function handleInvite(e) {
    e.preventDefault();
    if (!draft.email.trim()) return;
    setBusy(true);
    try {
      const inviteId = await createInvite(
        { role: 'admin', companyId, companyName, email: draft.email },
        currentUser.uid
      );
      setDraft({ name: '', email: '' });
      setFormOpen(false);
      refresh();
      flash('Invite created.');
      setInvite({
        link: `${window.location.origin}/accept-invite/${inviteId}`,
        label: draft.name.trim() || draft.email.trim(),
        roleLabel: 'Admin',
      });
    } catch {
      flash('We could not create this invite.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeAdminAccess(admin) {
    if (admin.uid === currentUser.uid) {
      flash('You cannot remove your own admin access.', 'error');
      return;
    }
    setBusyRow(admin.uid);
    try {
      await setUserRole(admin.uid, 'driver');
      flash(`${admin.email} is now a driver.`);
      refresh();
    } catch {
      flash('We could not update this account.', 'error');
    } finally {
      setBusyRow(null);
    }
  }

  async function cancelInvite(inv) {
    setBusyRow(inv.id);
    try {
      await revokeInvite(inv.id);
      flash('Invite cancelled.');
      refresh();
    } catch {
      flash('We could not cancel this invite.', 'error');
    } finally {
      setBusyRow(null);
    }
  }

  const rows = [
    ...admins.map((m) => ({ kind: 'member', ...m })),
    ...invites.map((i) => ({ kind: 'invite', ...i })),
  ];

  return (
    <div className="page">
      <h1>Team</h1>
      <p className="page-sub">This company's fleet administrators</p>

      <div className="toolbar">
        <div className="toolbar-spacer" />
        <button className="btn-primary" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : 'Invite another admin'}</button>
      </div>

      {formOpen && (
        <form onSubmit={handleInvite} className="card form-grid">
          <div className="form-field"><label>Name</label><input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></div>
          <div className="form-field"><label>Email</label><input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="name@example.co.za" /></div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Creating invite…' : 'Create invite'}</button>
        </form>
      )}

      <div className="table-card">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Since</th><th></th></tr></thead>
          <tbody>
            {rows.map((row) =>
              row.kind === 'member' ? (
                <tr key={row.uid}>
                  <td>{row.name || '—'}</td>
                  <td>{row.email}</td>
                  <td><StatusChip status="Active" /></td>
                  <td className="dim">{formatDate(row.createdAt)}</td>
                  <td>
                    <button className="btn-danger btn-inline" disabled={busyRow === row.uid} onClick={() => removeAdminAccess(row)}>
                      Remove admin access
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td className="dim">—</td>
                  <td>{row.email}</td>
                  <td><StatusChip status="Invited" /></td>
                  <td className="dim">{formatDate(row.createdAt)}</td>
                  <td>
                    <button
                      className="btn-row-action"
                      disabled={busyRow === row.id}
                      onClick={() => setInvite({ link: `${window.location.origin}/accept-invite/${row.id}`, label: row.email, roleLabel: 'Admin' })}
                    >
                      Copy invite link
                    </button>
                    <button className="btn-row-action" disabled={busyRow === row.id} onClick={() => cancelInvite(row)}>Cancel</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="table-empty">
            <div className="table-empty-mark" />
            <div className="table-empty-title">No other admins yet</div>
            <div className="table-empty-body">Invite another admin if more than one person needs to manage this fleet.</div>
          </div>
        )}
      </div>
      <InviteLinkDrawer invite={invite} onClose={() => setInvite(null)} />
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
