import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCompany, updateCompany } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

const EMPTY_DRAFT = { contactName: '', contactEmail: '', contactPhone: '', address: '', branches: '' };

export function CompanySettings() {
  const { profile } = useAuth();
  const companyId = profile?.companyId;
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, flash] = useFlash();

  useEffect(() => {
    if (!companyId) return;
    getCompany(companyId).then((c) => {
      setDraft({
        contactName: c?.contactName || '',
        contactEmail: c?.contactEmail || '',
        contactPhone: c?.contactPhone || '',
        address: c?.address || '',
        branches: (c?.branches || []).join(', '),
      });
      setLoaded(true);
    });
  }, [companyId]);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateCompany(companyId, {
        contactName: draft.contactName.trim(),
        contactEmail: draft.contactEmail.trim(),
        contactPhone: draft.contactPhone.trim(),
        address: draft.address.trim(),
        branches: draft.branches.split(',').map((b) => b.trim()).filter(Boolean),
      });
      flash('Company details saved.');
    } catch {
      flash('We could not save these details.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Company settings</h1>
      <p className="page-sub">Contact details and branches on file with the Car Care team</p>

      {loaded && (
        <form onSubmit={handleSave} className="card form-grid">
          <div className="form-field"><label>Contact name</label><input value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} /></div>
          <div className="form-field"><label>Contact email</label><input type="email" value={draft.contactEmail} onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))} /></div>
          <div className="form-field"><label>Contact phone <span className="optional">optional</span></label><input value={draft.contactPhone} onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))} /></div>
          <div className="form-field"><label>Address <span className="optional">optional</span></label><input value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} /></div>
          <div className="form-field span-2"><label>Branches <span className="optional">optional</span></label><input value={draft.branches} onChange={(e) => setDraft((d) => ({ ...d, branches: e.target.value }))} placeholder="Johannesburg, Cape Town" /></div>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      )}
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
