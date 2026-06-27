'use client';

import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export interface AuthState {
  user: User | null;
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
  loading: boolean;
  getToken: () => Promise<string>;
  /** Create an account. If currently anonymous, links so journal data is kept. */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign in to an existing account. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out and return to a fresh anonymous session. */
  signOutUser: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped after auth mutations (e.g. linkWithCredential) that don't refire
  // onAuthStateChanged, so the UI reflects the upgraded account immediately.
  const [, setVersion] = useState(0);

  const refresh = () => {
    setUser(auth.currentUser);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged fires again with the new anonymous user.
        } catch (err) {
          console.error('Anonymous sign-in failed:', err);
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, []);

  const getToken = async (): Promise<string> => {
    if (!auth.currentUser) return '';
    return auth.currentUser.getIdToken();
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      // Upgrade the anonymous account in place so existing journal data is kept.
      const cred = EmailAuthProvider.credential(email, password);
      await linkWithCredential(current, cred);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    refresh();
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    refresh();
  };

  const signOutUser = async (): Promise<void> => {
    await signOut(auth);
    // onAuthStateChanged will create a fresh anonymous session.
  };

  return {
    user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    isAnonymous: user?.isAnonymous ?? false,
    loading,
    getToken,
    signUp,
    signIn,
    signOutUser,
  };
}
