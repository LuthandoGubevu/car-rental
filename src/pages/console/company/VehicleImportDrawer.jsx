import { useState } from 'react';
import { findUserByEmail, bulkAddVehicles } from '../../../lib/firestore';

const HEADER_ALIASES = {
  make: 'make',
  model: 'model',
  year: 'year',
  reg: 'reg',
  registration: 'reg',
  vin: 'vin',
  mileage: 'mileage',
  branch: 'branch',
  'driver email': 'driverEmail',
  driveremail: 'driverEmail',
  email: 'driverEmail',
};

const MAX_ROWS = 2000;
const PREVIEW_CAP = 200;

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
  const dataRows = rawRows
    .slice(1)
    .filter((r) => r.some((cell) => cellToString(cell) !== ''));
  return dataRows.map((r, i) => {
    const get = (key) => (fieldIndex[key] === undefined ? '' : cellToString(r[fieldIndex[key]]));
    return {
      rowNumber: i + 2,
      make: get('make'),
      model: get('model'),
      year: get('year'),
      reg: get('reg'),
      vin: get('vin'),
      mileage: get('mileage'),
      branch: get('branch'),
      driverEmail: get('driverEmail'),
    };
  });
}

function validateRows(rows, existingRegs) {
  const seenRegs = new Set();
  return rows.map((row) => {
    const reg = row.reg.toUpperCase();
    let reason = null;
    if (!row.make || !row.model || !row.reg) {
      reason = 'Missing make, model or registration';
    } else if (existingRegs.has(reg)) {
      reason = 'A vehicle with this registration already exists';
    } else if (seenRegs.has(reg)) {
      reason = 'Duplicate registration in this file';
    }
    if (!reason) seenRegs.add(reg);
    return { ...row, valid: !reason, reason };
  });
}

function downloadTemplate() {
  const csv = 'Make,Model,Year,Reg,VIN,Mileage,Branch,Driver Email\nToyota,Corolla,2022,CA123456,AHTZZ123456789,15000,Johannesburg,\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vehicle-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function VehicleImportDrawer({ companyId, existingVehicles, onClose, onImported }) {
  const [step, setStep] = useState('pick'); // pick | preview | importing | done
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

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
        setError(`This file has ${rows.length} rows — please split it into files of ${MAX_ROWS} rows or fewer.`);
        return;
      }
      const existingRegs = new Set((existingVehicles || []).map((v) => (v.reg || '').toUpperCase()));
      setParsedRows(validateRows(rows, existingRegs));
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
      const resolved = [];
      for (let i = 0; i < validRows.length; i += 20) {
        const chunk = validRows.slice(i, i + 20);
        const results = await Promise.all(
          chunk.map(async (row) => {
            let driverUid = null;
            let customer = '';
            if (row.driverEmail) {
              const driver = await findUserByEmail(row.driverEmail, companyId);
              if (driver) {
                driverUid = driver.uid;
                customer = driver.name;
              }
            }
            return {
              make: row.make,
              model: row.model,
              year: row.year,
              reg: row.reg,
              vin: row.vin,
              mileage: row.mileage,
              branch: row.branch,
              driverUid,
              customer,
              status: driverUid ? 'Active Lease' : 'Available',
            };
          })
        );
        resolved.push(...results);
      }
      await bulkAddVehicles(resolved, companyId);
      setSummary({ imported: resolved.length, skipped: parsedRows.length - validRows.length });
      setStep('done');
      onImported();
    } catch {
      setError('We could not import these vehicles. Please try again.');
      setStep('preview');
    }
  }

  const validCount = parsedRows.filter((r) => r.valid).length;

  return (
    <div className="drawer-backdrop">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-eyebrow">Bulk import</div>
            <h2 className="drawer-title">Import vehicles from a file</h2>
            {step === 'preview' && (
              <p className="drawer-meta">{validCount} of {parsedRows.length} rows will be imported</p>
            )}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          {step === 'pick' && (
            <>
              <p className="muted" style={{ marginBottom: 14 }}>
                Upload a .csv or .xlsx file with columns for Make, Model, Year, Reg, VIN, Mileage, Branch,
                and optionally Driver Email (the driver must already have an account in this company).
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
                  <thead><tr><th>Row</th><th>Vehicle</th><th>Reg</th><th>Driver email</th><th>Status</th></tr></thead>
                  <tbody>
                    {parsedRows.slice(0, PREVIEW_CAP).map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="dim">{row.rowNumber}</td>
                        <td>{row.make} {row.model}</td>
                        <td>{row.reg || '—'}</td>
                        <td className="dim">{row.driverEmail || '—'}</td>
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

          {step === 'importing' && <p className="muted">Importing vehicles…</p>}

          {step === 'done' && summary && (
            <div className="banner banner-success">
              <span className="banner-icon">✓</span>
              {summary.imported} vehicle{summary.imported === 1 ? '' : 's'} imported
              {summary.skipped > 0 ? `, ${summary.skipped} skipped.` : '.'}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {step === 'preview' && (
            <>
              <button className="btn-primary" disabled={validCount === 0} onClick={handleImport}>
                Import {validCount} vehicle{validCount === 1 ? '' : 's'}
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
