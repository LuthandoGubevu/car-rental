import { useState } from 'react';

export function InviteLinkDrawer({ invite, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!invite) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. an insecure context) - the
      // link is still selectable/copyable by hand from the input below.
    }
  }

  return (
    <div className="drawer-backdrop">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-eyebrow">Invite link</div>
            <h2 className="drawer-title">{invite.label}</h2>
            <p className="drawer-meta">Share this so they can set up their own {invite.roleLabel.toLowerCase()} account.</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div className="form-field">
            <label>Invite link</label>
            <input readOnly value={invite.link} onFocus={(e) => e.target.select()} />
          </div>
          <p className="muted">This link is single-use and lets them set their own password. It works until they accept it.</p>
        </div>
        <div className="drawer-foot">
          <button className="btn-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
