'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        setMessage("You're on the list. We'll reach out when Driftwatch Pro launches.");
        setEmail('');
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to join waitlist. Please try again.');
    }
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div
          className="relative rounded-2xl border border-[#506880] bg-[#111827] p-8 md:p-12 overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(59, 130, 246, 0.06)' }}
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7db8fc]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-[#fbbf24] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            Coming Soon — Driftwatch Pro
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#f1f5f9] mb-3">
            More is coming
          </h2>
          <p className="text-[#b0bec9] mb-8 leading-relaxed">
            Driftwatch Pro will show you what your config is actually costing you — and how to fix it.
          </p>

          {/* Feature list */}
          <ul className="space-y-5 mb-8">
            {[
              { q: 'Why does my agent forget instructions?', a: 'See exactly which rules survive long conversations and which ones vanish silently.' },
              { q: 'Where are my tokens going?', a: 'Your config files get re-injected every message. We\u2019ll show you the per-message cost and where to cut.' },
              { q: 'Why do my subagents behave differently?', a: 'Three of your eight config files are invisible to subagents. We\u2019ll show you which ones.' },
              { q: 'Which files are starving which?', a: 'OpenClaw loads your files in a fixed order. The last file gets whatever budget is left. We\u2019ll show the cascade.' },
            ].map(({ q, a }) => (
              <li key={q} className="flex gap-3 text-sm">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-[#f1f5f9]">{q}</span>
                  <br />
                  <span className="text-[#b0bec9]">{a}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Form */}
          {status === 'success' ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[#34d399] text-sm">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 rounded-xl border border-[#506880] bg-[#0d1520] text-[#f1f5f9] placeholder-[#7a8a9b] font-mono text-sm disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                }}
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  'Join Waitlist'
                )}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-[#f87171]">{message}</p>
          )}

          <p className="mt-4 text-xs text-[#7a8a9b]">
            No spam. Unsubscribe anytime. We&apos;ll only reach out when something real ships.
          </p>
        </div>
      </div>
    </section>
  );
}
