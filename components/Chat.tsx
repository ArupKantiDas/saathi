'use client';

import { useState, useRef, useEffect } from 'react';
import type { Helpline } from '@/lib/knowledge/helplines';
import CrisisBanner from './CrisisBanner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  provider: 'gemini' | 'bedrock' | 'none';
  degraded: boolean;
  reply: string;
  crisis: boolean;
  helplines?: Helpline[];
}

interface ChatProps {
  exam: string;
  getToken: () => Promise<string>;
  recentContext?: string;
}

export default function Chat({ exam, getToken, recentContext }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi, I\'m here with you. Is there anything on your mind you\'d like to talk through?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [crisisHelplines, setCrisisHelplines] = useState<Helpline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exam,
          messages: nextMessages,
          ...(recentContext ? { recentContext } : {}),
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? `Error ${res.status}`);
      }

      const data = (await res.json()) as ChatResponse;
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.crisis) {
        setCrisis(true);
        setCrisisHelplines(data.helplines ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Crisis */}
      {crisis && crisisHelplines.length > 0 && (
        <CrisisBanner helplines={crisisHelplines} />
      )}

      {/* Message list */}
      <div
        aria-live="polite"
        aria-label="Conversation"
        className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="rounded-2xl px-4 py-3 text-sm max-w-[85%]"
              style={{
                background:
                  msg.role === 'user'
                    ? 'var(--color-brand)'
                    : 'var(--bg-surface)',
                color:
                  msg.role === 'user'
                    ? 'var(--color-text-invert)'
                    : 'var(--color-text)',
                boxShadow: 'var(--shadow-card)',
                lineHeight: 1.6,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
              aria-label="Saathi is thinking"
            >
              <span
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '1.2rem',
                  letterSpacing: '0.15em',
                }}
              >
                &bull;&bull;&bull;
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-3 py-2 text-sm"
          role="alert"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--color-text)' }}
        >
          {error}
        </div>
      )}

      {/* Input area */}
      <div
        className="flex gap-2 items-end"
        role="form"
        aria-label="Send a message"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message Saathi…"
          rows={1}
          className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--bg-surface-2)',
            color: 'var(--color-text)',
            lineHeight: 1.5,
            outline: 'none',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          aria-label="Chat input"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--bg-surface-2)';
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="rounded-2xl flex items-center justify-center transition-opacity"
          style={{
            background: 'var(--color-brand)',
            color: 'var(--color-text-invert)',
            opacity: !input.trim() || loading ? 0.5 : 1,
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            minWidth: '48px',
            minHeight: '48px',
            fontSize: '1.2rem',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
