'use client';

import { TECHNIQUES } from '@/lib/knowledge/techniques';
import GroundingButton from './GroundingButton';

const CATEGORY_LABELS: Record<string, string> = {
  breathing:  'Breathing',
  grounding:  'Grounding',
  cognitive:  'Mindset',
  behavioral: 'Action',
  rest:       'Rest',
};

const CATEGORY_COLORS: Record<string, string> = {
  breathing:  'var(--color-brand-soft)',
  grounding:  '#e8f3e8',
  cognitive:  '#f3e8f0',
  behavioral: '#f3f0e8',
  rest:       '#e8eef3',
};

export default function CalmTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          When you need it
        </p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Calm toolkit
        </h2>
      </div>

      {/* Technique cards */}
      <ul className="flex flex-col gap-4" aria-label="Coping techniques">
        {TECHNIQUES.map((technique) => (
          <li key={technique.id}>
            <article
              className="card"
              aria-label={technique.name}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: CATEGORY_COLORS[technique.category] ?? 'var(--bg-muted)',
                        color: 'var(--color-text-soft)',
                      }}
                    >
                      {CATEGORY_LABELS[technique.category] ?? technique.category}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {technique.durationMin} min
                    </span>
                  </div>
                  <h3
                    className="text-base font-bold leading-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {technique.name}
                  </h3>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: 'var(--color-text-soft)' }}
                  >
                    {technique.oneLiner}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <ol className="flex flex-col gap-2">
                {technique.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm" style={{ color: 'var(--color-text)' }}>
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{
                        background: 'var(--color-brand-soft)',
                        color: 'var(--color-brand-dark)',
                      }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <a
                href={technique.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs"
                style={{ color: 'var(--color-brand)' }}
                aria-label={`Source for ${technique.name} (opens in new tab)`}
              >
                Evidence source ↗
              </a>
            </article>
          </li>
        ))}
      </ul>

      {/* Space for the floating button */}
      <div className="h-16" aria-hidden="true" />

      {/* Floating grounding button */}
      <GroundingButton />
    </div>
  );
}
