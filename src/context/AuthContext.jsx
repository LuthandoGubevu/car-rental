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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const snap = await getDoc(doc(db, 'users', nextUser.uid));
        setProfile(snap.exists() ? snap.data() : null);
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
