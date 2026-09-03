import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVehicleForDriver, createSubmission, uploadSubmissionPhotos } from '../../lib/firestore';
import { CameraCapture } from '../../components/CameraCapture';

const ANGLES = [
  { key: 'front', label: 'Front', guide: 'Stand about 3 metres in front of the vehicle, centred on the number plate.' },
  { key: 'left', label: 'Left Side', guide: "Stand back from the driver's side so the full length of the vehicle fits in frame." },
  { key: 'rear', label: 'Rear', guide: 'Stand about 3 metres behind the vehicle, centred on the rear plate.' },
  { key: 'right', label: 'Right Side', guide: 'Stand back from the passenger side so the full length of the vehicle fits in frame.' },
];

const DAMAGE_TYPES = ['Scratch or scuff', 'Dent', 'Cracked or broken part', 'Chip damage (windscreen/glass)', 'Missing part', 'Other'];

export function VehicleCheck() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(undefined);
  const [step, setStep] = useState(0); // 0..3 capture, 4 damage, 5 review
  const [photos, setPhotos] = useState({});
  const [reportDamage, setReportDamage] = useState(false);
  const [damage, setDamage] = useState({ type: DAMAGE_TYPES[0], area: '', description: '', date: '', notFault: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getVehicleForDriver(user.uid).then(setVehicle);
  }, [user.uid]);

  if (vehicle === undefined) return <div className="page-loading">Loading…</div>;
  if (!vehicle) return <div className="page"><p>No vehicle is linked to your account.</p></div>;

  const capturing = step < ANGLES.length;
  const angle = ANGLES[step];

  function handleCapture(blob) {
    setPhotos((prev) => ({ ...prev, [angle.key]: { file: blob, previewUrl: URL.createObjectURL(blob) } }));
  }

  function retake() {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[angle.key];
      return next;
    });
  }

  function next() {
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const files = Object.fromEntries(Object.entries(photos).map(([k, v]) => [k, v.file]));
      const urls = await uploadSubmissionPhotos(user.uid, files);
      const { ref } = await createSubmission({
        uid: user.uid,
        companyId: profile?.companyId,
        driverName: profile?.name,
        vehicle,
        photos: urls,
        damage: reportDamage ? damage : null,
      });
      navigate('/dashboard/history', { state: { justSubmitted: ref } });
    } catch {
      setError('We could not submit your condition check. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Vehicle Condition Check</h1>
      <p className="page-sub">{vehicle.make} {vehicle.model} · {vehicle.reg}</p>

      {capturing && (
        <div className="card capture-card">
          <div className="step-indicator">Step {step + 1} of {ANGLES.length + 2}: {angle.label}</div>
          <p className="muted">{angle.guide}</p>
          {photos[angle.key] ? (
            <>
              <img className="capture-preview" src={photos[angle.key].previewUrl} alt={angle.label} />
              <button className="btn-secondary" onClick={retake}>Retake photo</button>
              <button className="btn-primary btn-inline" onClick={next}>Continue</button>
            </>
          ) : (
            <CameraCapture onCapture={handleCapture} />
          )}
        </div>
      )}

      {step === ANGLES.length && (
        <div className="card">
          <div className="step-indicator">Step {ANGLES.length + 1} of {ANGLES.length + 2}: Damage</div>
          <label className="checkbox-row">
            <input type="checkbox" checked={reportDamage} onChange={(e) => setReportDamage(e.target.checked)} />
            Report new damage on this vehicle
          </label>
          {reportDamage && (
            <div className="form-grid">
              <div className="form-field">
                <label>Type of damage</label>
                <select value={damage.type} onChange={(e) => setDamage((d) => ({ ...d, type: e.target.value }))}>
                  {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Area</label>
                <input value={damage.area} onChange={(e) => setDamage((d) => ({ ...d, area: e.target.value }))} placeholder="e.g. Front bumper, left" />
              </div>
              <div className="form-field span-2">
                <label>Description</label>
                <textarea value={damage.description} onChange={(e) => setDamage((d) => ({ ...d, description: e.target.value }))} placeholder="Describe what happened" />
              </div>
              <div className="form-field">
                <label>Date noticed</label>
                <input type="date" value={damage.date} onChange={(e) => setDamage((d) => ({ ...d, date: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="checkbox-row">
                  <input type="checkbox" checked={damage.notFault} onChange={(e) => setDamage((d) => ({ ...d, notFault: e.target.checked }))} />
                  This was not caused by me (e.g. existing damage, vandalism)
                </label>
              </div>
            </div>
          )}
          <button className="btn-primary btn-inline" onClick={next}>Continue</button>
        </div>
      )}

      {step === ANGLES.length + 1 && (
        <div className="card">
          <div className="step-indicator">Step {ANGLES.length + 2} of {ANGLES.length + 2}: Review and submit</div>
          <div className="review-grid">
            {ANGLES.map((a) => (
              <div key={a.key} className="review-photo">
                <img src={photos[a.key]?.previewUrl} alt={a.label} />
                <span>{a.label}</span>
              </div>
            ))}
          </div>
          {reportDamage ? (
            <div className="damage-summary">
              <strong>Damage reported:</strong> {damage.type} — {damage.area || 'area not specified'}
            </div>
          ) : (
            <div className="damage-summary muted">No damage reported.</div>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary btn-inline" disabled={busy} onClick={handleSubmit}>
            {busy ? 'Submitting…' : 'Submit condition check'}
          </button>
        </div>
      )}
    </div>
  );
}
