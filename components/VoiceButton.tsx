'use client';

/**
 * VoiceButton — a mic toggle button for voice input.
 * Hidden when speech is not supported. Respects prefers-reduced-motion.
 */

interface VoiceButtonProps {
  listening: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

export default function VoiceButton({
  listening,
  onToggle,
  label = listening ? 'Stop recording' : 'Start voice input',
  className = '',
}: VoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={listening}
      className={`flex items-center justify-center rounded-full transition-colors ${className}`}
      style={{
        width: '40px',
        height: '40px',
        background: listening
          ? 'var(--color-brand)'
          : 'var(--bg-surface-2)',
        color: listening
          ? 'var(--color-text-invert)'
          : 'var(--color-text-soft)',
        border: listening
          ? '2px solid var(--color-brand)'
          : '2px solid transparent',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      {/* Mic icon — SVG inline so no icon library needed */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="18"
        height="18"
        aria-hidden="true"
      >
        {listening ? (
          /* Square "stop" indicator when recording */
          <rect x="6" y="6" width="12" height="12" rx="2" />
        ) : (
          /* Mic icon when idle */
          <>
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
            <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 10z" />
          </>
        )}
      </svg>

      {/* Pulse ring when listening — hidden for prefers-reduced-motion */}
      {listening && (
        <span
          aria-hidden="true"
          className="voice-pulse"
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '2px solid var(--color-brand)',
            opacity: 0.5,
            pointerEvents: 'none',
            animation: 'voice-ring 1.2s ease-out infinite',
          }}
        />
      )}
    </button>
  );
}
