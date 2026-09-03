import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listCompanyUsers, listCompanyInvites, createInvite, revokeInvite, setUserRole, getCompany } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';
import { StatusChip } from '../../components/StatusChip';
import { InviteLinkDrawer } from '../../components/InviteLinkDrawer';

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Drivers() {
  const { user: currentUser, profile } = useAuth();
  const companyId = profile?.companyId;
  const [members, setMembers] = useState([]);
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
    listCompanyUsers(companyId).then((all) => setMembers(all.filter((m) => m.role === 'driver')));
    listCompanyInvites(companyId).then((all) => setInvites(all.filter((i) => i.status === 'pending' && i.role === 'driver')));
  }

  useEffect(refresh, [companyId]);
  useEffect(() => {
    if (companyId) getCompany(companyId).then((c) => setCompanyName(c?.name || ''));
  }, [companyId]);

  async function handleInvite(e) {
    e.preventDefault();
    if (!draft.email.trim()) return;
    setBusy(true);
    try {
      const inviteId = await createInvite(
        { role: 'driver', companyId, companyName, email: draft.email },
        currentUser.uid
      );
      setDraft({ name: '', email: '' });
      setFormOpen(false);
      refresh();
      flash('Invite created.');
      setInvite({
        link: `${window.location.origin}/accept-invite/${inviteId}`,
        label: draft.name.trim() || draft.email.trim(),
        roleLabel: 'Driver',
      });
    } catch {
      flash('We could not create this invite.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function makeAdmin(member) {
    setBusyRow(member.uid);
    try {
      await setUserRole(member.uid, 'admin');
      flash(`${member.email} is now an admin.`);
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
    ...members.map((m) => ({ kind: 'member', ...m })),
    ...invites.map((i) => ({ kind: 'invite', ...i })),
  ];

  return (
    <div className="page">
      <h1>Drivers</h1>
      <p className="page-sub">Everyone submitting condition checks for your fleet</p>

      <div className="toolbar">
        <div className="toolbar-spacer" />
        <button className="btn-primary" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : 'Invite a driver'}</button>
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
                    <button className="btn-row-action" disabled={busyRow === row.uid} onClick={() => makeAdmin(row)}>
                      Make admin
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
                      onClick={() => setInvite({ link: `${window.location.origin}/accept-invite/${row.id}`, label: row.email, roleLabel: 'Driver' })}
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
            <div className="table-empty-title">No drivers yet</div>
            <div className="table-empty-body">Invite your first driver to get started.</div>
          </div>
        )}
      </div>
      <InviteLinkDrawer invite={invite} onClose={() => setInvite(null)} />
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
