'use client';

import type { Helpline } from '@/lib/knowledge/helplines';

interface CrisisBannerProps {
  helplines: Helpline[];
}

export default function CrisisBanner({ helplines }: CrisisBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="rounded-2xl p-4 mb-4"
      style={{
        background: 'var(--color-crisis-bg)',
        border: '1.5px solid var(--color-crisis)',
      }}
    >
      <p
        className="font-semibold mb-1"
        style={{ color: 'var(--color-crisis)', fontSize: '1rem' }}
      >
        You&rsquo;re not alone right now.
      </p>
      <p
        className="mb-3"
        style={{ color: 'var(--color-crisis)', fontSize: '0.875rem', opacity: 0.9 }}
      >
        If you&rsquo;re in distress, please reach out to one of these free helplines.
        Trained people are ready to listen.
      </p>
      <ul className="flex flex-col gap-2">
        {helplines.map((h) => (
          <li key={h.number}>
            <a
              href={`tel:${h.number.replace(/\s|-/g, '')}`}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-opacity hover:opacity-90"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--color-crisis)',
                textDecoration: 'none',
                minHeight: '44px',
              }}
              aria-label={`Call ${h.name} at ${h.number}, ${h.hours}`}
            >
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{ color: 'var(--color-text)' }}
                >
                  {h.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  {h.hours}
                </p>
              </div>
              <span
                className="font-bold text-sm ml-2"
                style={{ color: 'var(--color-crisis)' }}
              >
                {h.number}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
