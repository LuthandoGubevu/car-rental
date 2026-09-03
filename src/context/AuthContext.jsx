import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { acceptInviteTransaction } from '../lib/firestore';

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

  // Accounts are always invite-provisioned (an admin invites a driver, staff
  // invites a company's first admin) - there is no public self-serve signup.
  // This creates the Auth account, then atomically writes the Firestore
  // profile and marks the invite consumed; if the Firestore side fails (e.g.
  // the invite was already used), the just-created Auth account is deleted
  // rather than left as an orphaned account with no profile.
  async function acceptInvite(inviteId, { firstName, surname, idNumber, mobile, number, branch }, password, email) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = [firstName, surname].filter(Boolean).join(' ').trim();
    try {
      await acceptInviteTransaction(inviteId, cred.user.uid, {
        firstName: firstName || '',
        surname: surname || '',
        name: name || email,
        idNumber: idNumber || '',
        mobile: mobile || '',
        number: number || '',
        branch: branch || '',
      });
    } catch (err) {
      await cred.user.delete();
      throw err;
    }
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    setProfile(snap.data());
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
    acceptInvite,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
