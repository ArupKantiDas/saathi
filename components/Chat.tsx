'use client';

import { useState, useRef, useEffect } from 'react';
import type { Helpline } from '@/lib/knowledge/helplines';
import CrisisBanner from './CrisisBanner';
import VoiceButton from './VoiceButton';
import { useSpeechToText, useTextToSpeech } from '@/lib/voice/useSpeech';

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
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const stt = useSpeechToText();
  const tts = useTextToSpeech();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Append transcript to chat input when STT stops
  useEffect(() => {
    if (!stt.listening && stt.transcript) {
      setInput((prev) => {
        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + stt.transcript;
      });
      stt.reset();
    }
  }, [stt.listening, stt.transcript, stt.reset]);

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

  const handleVoiceToggle = () => {
    if (stt.listening) {
      stt.stop();
    } else {
      stt.start();
    }
  };

  const handleSpeakToggle = (content: string, index: number) => {
    if (speakingIndex === index && tts.speaking) {
      tts.stop();
      setSpeakingIndex(null);
    } else {
      tts.stop();
      setSpeakingIndex(index);
      tts.speak(content);
    }
  };

  // Clear speakingIndex when TTS finishes
  useEffect(() => {
    if (!tts.speaking) {
      setSpeakingIndex(null);
    }
  }, [tts.speaking]);

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

              {/* Read aloud button for assistant messages */}
              {msg.role === 'assistant' && tts.supported && (
                <button
                  type="button"
                  onClick={() => handleSpeakToggle(msg.content, i)}
                  aria-label={
                    speakingIndex === i && tts.speaking
                      ? 'Stop reading aloud'
                      : 'Read this message aloud'
                  }
                  aria-pressed={speakingIndex === i && tts.speaking}
                  className="mt-2 flex items-center gap-1 text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  >
                    {speakingIndex === i && tts.speaking ? (
                      <>
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </>
                    ) : (
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    )}
                  </svg>
                  {speakingIndex === i && tts.speaking ? 'Stop' : 'Read aloud'}
                </button>
              )}
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

      {/* Live transcript hint */}
      {stt.listening && stt.transcript && (
        <p
          className="text-xs italic"
          style={{ color: 'var(--color-text-muted)' }}
          aria-live="polite"
          aria-label="Live transcript"
        >
          {stt.transcript}
        </p>
      )}

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
        {/* Mic button — hidden if STT not supported */}
        {stt.supported && (
          <VoiceButton
            listening={stt.listening}
            onToggle={handleVoiceToggle}
            label={stt.listening ? 'Stop voice input' : 'Dictate message'}
          />
        )}

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
