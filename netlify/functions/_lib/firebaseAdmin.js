import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

export function getAdminApp() {
  if (!app) {
    const existing = getApps();
    if (existing.length) {
      app = existing[0];
    } else {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      app = initializeApp({ credential: cert(serviceAccount) });
    }
  }
  return app;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
