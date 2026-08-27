import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateNotificationPrefs } from '../../lib/firestore';
import { useFlash } from '../../lib/useFlash';
import { Toast } from '../../components/Toast';

export function Notifications() {
  const { user, profile } = useAuth();
  const [notifyEmail, setNotifyEmail] = useState(profile?.notifyEmail ?? true);
  const [notifySms, setNotifySms] = useState(profile?.notifySms ?? true);
  const [toast, flash] = useFlash();

  async function save(next) {
    try {
      await updateNotificationPrefs(user.uid, next);
      flash('Notification settings saved.');
    } catch {
      flash('We could not save your settings.', 'error');
    }
  }

  return (
    <div className="page">
      <h1>Notification Settings</h1>
      <div className="card">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => {
              setNotifyEmail(e.target.checked);
              save({ notifyEmail: e.target.checked, notifySms });
            }}
          />
          Email me when my monthly condition check is due
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={notifySms}
            onChange={(e) => {
              setNotifySms(e.target.checked);
              save({ notifyEmail, notifySms: e.target.checked });
            }}
          />
          Text me when my monthly condition check is due
        </label>
      </div>
      <Toast message={toast?.message} kind={toast?.kind} />
    </div>
  );
}
