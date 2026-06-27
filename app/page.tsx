'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';
import type { AuthState } from '@/lib/hooks/useAuth';

export default function Home() {
  return (
    <AuthGate>
      {(auth) => <AppRouter auth={auth} />}
    </AuthGate>
  );
}

function AppRouter({ auth }: { auth: AuthState }) {
  const [exam, setExam] = useState<string | null>(null);
  const [examLoading, setExamLoading] = useState(true);

  useEffect(() => {
    if (!auth.uid) return;

    // Fast path: localStorage
    const cached =
      typeof window !== 'undefined' ? localStorage.getItem('saathi_exam') : null;
    if (cached) {
      setExam(cached);
      setExamLoading(false);
      return;
    }

    // Firestore fallback
    import('@/lib/store')
      .then(({ loadExam }) => loadExam(auth.uid!))
      .then((e) => {
        setExam(e);
        setExamLoading(false);
      })
      .catch(() => setExamLoading(false));
  }, [auth.uid]);

  if (examLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
        role="status"
        aria-label="Loading"
      >
        <div
          className="breathe-circle w-12 h-12 rounded-full"
          style={{ background: 'var(--color-brand-soft)', border: '2px solid var(--color-brand)' }}
        />
      </div>
    );
  }

  if (!exam) {
    return (
      <Onboarding
        uid={auth.uid!}
        onComplete={(selectedExam) => setExam(selectedExam)}
      />
    );
  }

  return <AppShell exam={exam} auth={auth} />;
}
