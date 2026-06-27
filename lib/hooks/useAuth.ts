'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export interface AuthState {
  user: User | null;
  uid: string | null;
  loading: boolean;
  getToken: () => Promise<string>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the new user
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

  return {
    user,
    uid: user?.uid ?? null,
    loading,
    getToken,
  };
}
