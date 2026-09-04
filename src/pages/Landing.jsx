import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createDemoRequest } from '../lib/firestore';

const DRIVER_STEPS = [
  ['Sign in each month', "A driver gets a reminder when their monthly check is due and signs in with their own account."],
  ['Take 4 live photos', 'The app opens the camera directly and guides them through front, left, rear, and right. No gallery uploads, so photos can’t be old or unrelated.'],
  ['Flag any new damage', 'Type, area, description, date, and whether it was their fault. This is optional and only shown if something needs reporting.'],
  ['Submit and get a verdict', 'Approved, or declined with specific reasons the driver can see and act on immediately.'],
];

const FLEET_STEPS = [
  ['We review every submission', "Our own compliance team checks all 4 photos and any damage report against your fleet records. It's never a queue dumped on your staff."],
  ['Every decision comes with reasons', "Approved, or declined with a specific, visible reason: blurry photo, wrong angle, doesn't match the vehicle. No black box, and no verdict your team has to make themselves."],
  ['Drivers see it and resubmit', 'No dead end: a decline shows the driver exactly what to fix, with a direct link to submit again.'],
  ['One clear Fleet Status report', 'See exactly where every vehicle stands: up to date, overdue, or flagged, plus every driver-reported incident, already triaged by us.'],
];

const FEATURES = [
  ['Built for the whole lease, not just the ends', 'Most rental tools check a vehicle at pickup and return. Car Care checks in every month, while the lease is still running, catching problems while they’re still small.'],
  ['Camera-locked, not gallery-uploaded', 'Drivers can’t submit an old or unrelated photo. The app takes over the camera directly, so every submission is verifiably current.'],
  ['Reviewed by people, not your team', 'No opaque AI verdict, and no review queue landing on your staff either. Our own compliance team checks every submission and gives clear, visible reasons for every decision. That kind of transparency keeps disputes from turning into arguments.'],
  ['Priced and built for South African fleets', 'Not a global enterprise platform retrofitted for a small fleet. Car Care is sized and priced for how South African rental and lease companies actually operate.'],
];

const FLEET_SIZES = ['1–25 vehicles', '26–100 vehicles', '101–300 vehicles', '300+ vehicles'];

export function Landing() {
  const { user, role } = useAuth();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', fleetSize: '', branches: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim() || !form.email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // Firestore queues writes when it can't reach the network rather than
      // rejecting - without this race, a visitor with a bad connection would
      // see "Sending…" spin forever with no feedback at all.
      await Promise.race([
        createDemoRequest(form),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      setSubmitted(true);
    } catch {
      setError('That took too long to send. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const accountLink = user ? (role === 'admin' ? '/admin' : role === 'staff' ? '/console' : '/dashboard') : '/login';
  const accountLabel = user ? 'Go to your account' : 'Log in';

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="brand-mark landing-brand">Car Care</div>
        <Link to={accountLink} className="btn-secondary">{accountLabel}</Link>
      </header>

      <section className="landing-hero">
        <p className="landing-eyebrow">For car rental &amp; lease fleets</p>
        <h1 className="landing-h1">The monthly vehicle check your fleet is missing</h1>
        <p className="landing-lead">
          Between pickup and return, most rental and lease companies never actually see the vehicle again.
          Car Care gives drivers a simple monthly photo check-in and hands you a compliance report reviewed
          by our own team, not another queue for yours. Damage, disputes, and overdue inspections stop hiding
          for months at a time.
        </p>
        <div className="landing-cta-row">
          <a href="#book-demo" className="btn-hero-primary btn-inline">Book a demo</a>
          <Link to={accountLink} className="btn-ghost-light btn-inline">{accountLabel}</Link>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">See it in action</h2>
        <div className="landing-shots-grid">
          <div className="landing-shot">
            <img src="/screenshots/admin-preview.png" alt="Car Care fleet console showing the review queue, vehicle count and recent submissions" loading="lazy" />
            <p className="landing-shot-caption">Your fleet team's dashboard</p>
          </div>
          <div className="landing-shot">
            <img src="/screenshots/customer-preview.png" alt="Car Care driver app showing a vehicle's condition check status and quick actions" loading="lazy" />
            <p className="landing-shot-caption">Your drivers' app</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-section-alt">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-tracks">
          <div className="landing-track">
            <p className="landing-track-label">For drivers</p>
            <ol className="landing-steps">
              {DRIVER_STEPS.map(([title, body], i) => (
                <li key={title}>
                  <span className="landing-step-num">{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <p className="muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="landing-track">
            <p className="landing-track-label">For your business</p>
            <ol className="landing-steps">
              {FLEET_STEPS.map(([title, body], i) => (
                <li key={title}>
                  <span className="landing-step-num">{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <p className="muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">Why Car Care</h2>
        <div className="landing-features">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="landing-feature">
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <h2 className="landing-section-title">Simple, per-vehicle pricing</h2>
        <p className="muted landing-demo-sub">
          From R42–R89 per vehicle/month, depending on fleet size.
        </p>
        <div className="landing-pricing-tags">
          <span className="landing-pricing-tag">Priced per vehicle, per month</span>
          <span className="landing-pricing-tag">Volume discounts as your fleet grows</span>
          <span className="landing-pricing-tag">White-label setup available</span>
          <span className="landing-pricing-tag">No long-term lock-in</span>
        </div>
        <div className="landing-cta-row">
          <a href="#book-demo" className="btn-orange btn-inline">Get a quote</a>
          <a href="#how-it-works" className="btn-ghost btn-inline">See how it works</a>
        </div>
      </section>

      <section id="book-demo" className="landing-section landing-demo">
        <h2 className="landing-section-title">Book a demo</h2>
        <p className="muted landing-demo-sub">
          Tell us about your fleet and we&apos;ll be in touch to show you Car Care running on your own vehicles.
        </p>

        {submitted ? (
          <div className="card landing-demo-success">
            <h3>Thanks, we&apos;ve got it.</h3>
            <p className="muted">We&apos;ll be in touch within 1 business day to set up your demo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card landing-demo-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Your name</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nomsa Mabaso" />
              </div>
              <div className="form-field">
                <label>Company</label>
                <input value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Motor Lease" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@company.co.za" />
              </div>
              <div className="form-field">
                <label>Phone <span className="optional">optional</span></label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="072 418 2290" />
              </div>
              <div className="form-field">
                <label>Fleet size <span className="optional">optional</span></label>
                <select value={form.fleetSize} onChange={(e) => update('fleetSize', e.target.value)}>
                  <option value="">Select a range</option>
                  {FLEET_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Branches <span className="optional">optional</span></label>
                <input value={form.branches} onChange={(e) => update('branches', e.target.value)} placeholder="Johannesburg, Cape Town" />
              </div>
              <div className="form-field span-2">
                <label>Anything else? <span className="optional">optional</span></label>
                <textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Tell us a bit about your current process" />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="landing-demo-foot">
              <span>We reply within one working day. No card, no obligation.</span>
              <button type="submit" className="btn-orange" disabled={busy}>{busy ? 'Sending…' : 'Book a demo'}</button>
            </div>
          </form>
        )}
      </section>

      <footer className="landing-footer">
        <span>Car Care</span>
        <span className="muted">Monthly vehicle condition checks for South African rental and lease fleets.</span>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/popia">POPIA Compliance</Link>
        </div>
        <span className="footer-copyright">© {new Date().getFullYear()} Car Care. All rights reserved.</span>
      </footer>
    </div>
  );
}
