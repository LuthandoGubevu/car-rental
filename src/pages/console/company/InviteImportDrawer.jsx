import { useState } from 'react';
import { bulkCreateInvites } from '../../../lib/firestore';

const HEADER_ALIASES = {
  name: 'name',
  email: 'email',
  'email address': 'email',
};

const MAX_ROWS = 2000;
const PREVIEW_CAP = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(h) {
  return String(h ?? '').trim().toLowerCase();
}

function cellToString(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function buildRows(rawRows) {
  if (!rawRows || rawRows.length === 0) return [];
  const fieldIndex = {};
  rawRows[0].forEach((h, idx) => {
    const normalized = normalizeHeader(h);
    const key = HEADER_ALIASES[normalized] || HEADER_ALIASES[normalized.replace(/\s+/g, '')];
    if (key && fieldIndex[key] === undefined) fieldIndex[key] = idx;
  });
  const dataRows = rawRows.slice(1).filter((r) => r.some((cell) => cellToString(cell) !== ''));
  return dataRows.map((r, i) => {
    const get = (key) => (fieldIndex[key] === undefined ? '' : cellToString(r[fieldIndex[key]]));
    return { rowNumber: i + 2, name: get('name'), email: get('email') };
  });
}

function validateRows(rows, existingEmails) {
  const seenEmails = new Set();
  return rows.map((row) => {
    const email = row.email.toLowerCase();
    let reason = null;
    if (!row.email) {
      reason = 'Missing email address';
    } else if (!EMAIL_PATTERN.test(row.email)) {
      reason = 'Not a valid email address';
    } else if (existingEmails.has(email)) {
      reason = 'Already a team member or already invited';
    } else if (seenEmails.has(email)) {
      reason = 'Duplicate email in this file';
    }
    if (!reason) seenEmails.add(email);
    return { ...row, valid: !reason, reason };
  });
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  downloadCsv('invite-import-template.csv', 'Name,Email\nJane Driver,jane@example.co.za\n');
}

export function InviteImportDrawer({ role, roleLabel, companyId, companyName, existingEmails, createdByUid, onClose, onImported }) {
  const [step, setStep] = useState('pick'); // pick | preview | importing | done
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const name = file.name.toLowerCase();
    try {
      let rawRows;
      if (name.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default;
        const text = await file.text();
        rawRows = Papa.parse(text, { skipEmptyLines: true }).data;
      } else if (name.endsWith('.xlsx')) {
        const { readSheet } = await import('read-excel-file/browser');
        rawRows = await readSheet(file);
      } else {
        setError('Please upload a .csv or .xlsx file.');
        return;
      }
      const rows = buildRows(rawRows);
      if (rows.length === 0) {
        setError('No data rows found in this file. Make sure the first row has column headers.');
        return;
      }
      if (rows.length > MAX_ROWS) {
        setError(`This file has ${rows.length} rows; please split it into files of ${MAX_ROWS} rows or fewer.`);
        return;
      }
      setParsedRows(validateRows(rows, existingEmails));
      setStep('preview');
    } catch {
      setError('We could not read this file. Please check the format and try again.');
    }
  }

  async function handleImport() {
    setStep('importing');
    setError(null);
    const validRows = parsedRows.filter((r) => r.valid);
    try {
      const created = await bulkCreateInvites(validRows, { role, companyId, companyName }, createdByUid);
      const withLinks = created.map((r) => ({ ...r, link: `${window.location.origin}/accept-invite/${r.id}` }));
      setResults(withLinks);
      setStep('done');
      onImported();
    } catch {
      setError('We could not create these invites. Please try again.');
      setStep('preview');
    }
  }

  function downloadResults() {
    const header = 'Name,Email,Invite Link\n';
    const body = results.map((r) => `${(r.name || '').replace(/,/g, ' ')},${r.email},${r.link}`).join('\n');
    downloadCsv('invite-links.csv', header + body + '\n');
  }

  const validCount = parsedRows.filter((r) => r.valid).length;

  return (
    <div className="drawer-backdrop">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-eyebrow">Bulk import</div>
            <h2 className="drawer-title">Invite {roleLabel.toLowerCase()}s from a file</h2>
            {step === 'preview' && (
              <p className="drawer-meta">{validCount} of {parsedRows.length} rows will be invited</p>
            )}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          {step === 'pick' && (
            <>
              <p className="muted" style={{ marginBottom: 14 }}>
                Upload a .csv or .xlsx file with a Name column (optional) and an Email column. Each row
                creates a one-time invite link for that {roleLabel.toLowerCase()} to set up their own account.
              </p>
              <button type="button" className="btn-secondary" onClick={downloadTemplate} style={{ marginBottom: 16 }}>
                Download template
              </button>
              <input type="file" accept=".csv,.xlsx" onChange={handleFile} />
              {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}
            </>
          )}

          {step === 'preview' && (
            <>
              {error && <div className="form-error">{error}</div>}
              <div className="table-card">
                <table className="table">
                  <thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                  <tbody>
                    {parsedRows.slice(0, PREVIEW_CAP).map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="dim">{row.rowNumber}</td>
                        <td>{row.name || '—'}</td>
                        <td>{row.email || '—'}</td>
                        <td style={{ color: row.valid ? 'var(--ok-fg)' : 'var(--danger-fg)', fontWeight: 600, fontSize: 12.5 }}>
                          {row.valid ? 'Ready' : row.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > PREVIEW_CAP && (
                <p className="muted" style={{ marginTop: 10 }}>
                  Showing the first {PREVIEW_CAP} of {parsedRows.length} rows.
                </p>
              )}
            </>
          )}

          {step === 'importing' && <p className="muted">Creating invites…</p>}

          {step === 'done' && (
            <>
              <div className="banner banner-success">
                <span className="banner-icon">✓</span>
                {results.length} invite{results.length === 1 ? '' : 's'} created.
              </div>
              <p className="muted" style={{ marginBottom: 14 }}>
                There's no email service built in, so download the links below and send them however you
                normally reach the team; each link can only be used once.
              </p>
              <button type="button" className="btn-secondary" onClick={downloadResults} style={{ marginBottom: 16 }}>
                Download invite links (CSV)
              </button>
              <div className="table-card">
                <table className="table">
                  <thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
                  <tbody>
                    {results.slice(0, PREVIEW_CAP).map((r) => (
                      <tr key={r.id}>
                        <td>{r.name || '—'}</td>
                        <td>{r.email}</td>
                        <td>
                          <button
                            className="btn-row-action"
                            onClick={() => navigator.clipboard?.writeText(r.link).catch(() => {})}
                          >
                            Copy link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.length > PREVIEW_CAP && (
                <p className="muted" style={{ marginTop: 10 }}>
                  Showing the first {PREVIEW_CAP} of {results.length}; the rest are in the downloaded CSV.
                </p>
              )}
            </>
          )}
        </div>

        <div className="drawer-foot">
          {step === 'preview' && (
            <>
              <button className="btn-primary" disabled={validCount === 0} onClick={handleImport}>
                Create {validCount} invite{validCount === 1 ? '' : 's'}
              </button>
              <button className="btn-secondary" onClick={() => setStep('pick')}>Back</button>
            </>
          )}
          {step === 'done' && <button className="btn-primary" onClick={onClose}>Done</button>}
          {(step === 'pick' || step === 'importing') && (
            <button className="btn-secondary" onClick={onClose} disabled={step === 'importing'}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
