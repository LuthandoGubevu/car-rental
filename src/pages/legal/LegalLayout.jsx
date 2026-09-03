import { Link } from 'react-router-dom';

export function LegalLayout({ title, updated, children }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand-mark landing-brand">Car Care</Link>
        <Link to="/" className="btn-secondary">Back to home</Link>
      </header>

      <div className="page page-narrow legal-page">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        {children}
      </div>

      <footer className="landing-footer">
        <span>Car Care</span>
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
