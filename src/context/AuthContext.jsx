import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setProfileError(null);
      if (nextUser) {
        // A denied or failed profile read must not leave the app stuck on a
        // loading screen forever - surface it and let the caller decide,
        // rather than an unhandled rejection skipping setLoading(false).
        try {
          const snap = await getDoc(doc(db, 'users', nextUser.uid));
          setProfile(snap.exists() ? snap.data() : null);
        } catch (err) {
          setProfile(null);
          setProfileError(err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // Self-serve signup always creates a customer account. Admin accounts are
  // provisioned by hand in Firestore (see README) - there is no UI path that
  // lets a signup grant itself the admin role.
  async function signUp({ email, password, firstName, surname, idNumber, mobile, number, branch }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = [firstName, surname].filter(Boolean).join(' ').trim();
    const profileDoc = {
      role: 'customer',
      email,
      firstName: firstName || '',
      surname: surname || '',
      name: name || email,
      idNumber: idNumber || '',
      mobile: mobile || '',
      number: number || '',
      branch: branch || '',
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileDoc);
    setProfile(profileDoc);
  }

  async function signOutUser() {
    await firebaseSignOut(auth);
  }

  const value = {
    user,
    profile,
    profileError,
    role: profile?.role || null,
    loading,
    signIn,
    signUp,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
