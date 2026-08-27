// Firebase initialization for the Vehicle Condition Check app.
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBoKWz6dm4AONDham17UxkU34Nk2eQvmGw',
  authDomain: 'stratifyai-d82ce.firebaseapp.com',
  projectId: 'stratifyai-d82ce',
  storageBucket: 'stratifyai-d82ce.firebasestorage.app',
  messagingSenderId: '716269216529',
  appId: '1:716269216529:web:953a8ffad1d376e99f62b0',
  measurementId: 'G-FGRZYC5EYF',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics needs browser APIs it doesn't have in SSR/test environments, and
// isSupported() itself resolves asynchronously, so it's wired up as a
// fire-and-forget rather than a plain top-level call.
export let analytics = null;
analyticsIsSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {});
