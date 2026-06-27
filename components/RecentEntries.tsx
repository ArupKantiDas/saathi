'use client';

import { useEffect, useState } from 'react';
import { listEntries, type Entry } from '@/lib/store';

function moodEmoji(m: number | null): string {
  if (m == null) return '📝';
  if (m <= 3) return '😔';
  if (m <= 5) return '😟';
  if (m <= 7) return '🙂';
  return '😌';
}

function whenLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${time}`;
}

export default function RecentEntries({ uid, reloadKey }: { uid: string; reloadKey?: number }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let active = true;
    listEntries(uid)
      .then((e) => active && setEntries(e))
      .catch(() => active && setEntries([]));
    return () => {
      active = false;
    };
  }, [uid, reloadKey]);

  if (entries === null || entries.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Your recent reflections">
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-soft)' }}>
        Your recent reflections
      </h2>
      <ul className="space-y-2">
        {entries.slice(0, 10).map((e, i) => (
          <li
            key={e.createdAt + '-' + i}
            className="card flex items-start gap-3"
            style={{ padding: '0.85rem 1rem' }}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {moodEmoji(e.mood)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {whenLabel(e.createdAt)}
                {e.mood != null ? ` · mood ${e.mood}/10` : ''}
              </p>
              <p
                className="text-sm"
                style={{
                  color: 'var(--color-text)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {e.entryText}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
