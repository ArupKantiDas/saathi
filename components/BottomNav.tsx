'use client';

export type Tab = 'today' | 'you' | 'calm';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today',  icon: '📖' },
  { id: 'you',   label: 'You',    icon: '🌀' },
  { id: 'calm',  label: 'Calm',   icon: '🌿' },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-30"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--bg-surface-2)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className="flex flex-col items-center gap-0.5 px-6 transition-all"
            style={{
              minWidth: '64px',
              minHeight: '48px',
              justifyContent: 'center',
              color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
              fontWeight: isActive ? '600' : '400',
              fontSize: '0.7rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1.3rem', lineHeight: 1 }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
