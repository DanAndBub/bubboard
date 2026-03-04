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
        setMessage("You're on the list. We'll reach out when BubBoard Pro launches.");
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
          className="relative rounded-2xl border border-[#1e293b] bg-[#111827] p-8 md:p-12 overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(59, 130, 246, 0.06)' }}
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Coming Soon — BubBoard Pro
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#e2e8f0] mb-3">
            More is coming
          </h2>
          <p className="text-[#94a3b8] mb-8 leading-relaxed">
            BubBoard Pro is in development. Get early access to multi-agent monitoring,
            cost analytics, security alerts, and real-time agent health dashboards.
          </p>

          {/* Feature list */}
          <ul className="space-y-2 mb-8">
            {[
              'Multi-agent monitoring across environments',
              'Cost analytics per agent and task',
              'Security alerts for unusual patterns',
              'Real-time health dashboards',
            ].map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm text-[#94a3b8]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Form */}
          {status === 'success' ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 text-sm">{message}</p>
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
                className="flex-1 px-4 py-3 rounded-xl border border-[#1e293b] bg-[#0d1520] text-[#e2e8f0] placeholder-[#475569] font-mono text-sm disabled:opacity-50 transition-all"
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
            <p className="mt-3 text-sm text-red-400">{message}</p>
          )}

          <p className="mt-4 text-xs text-[#475569]">
            No spam. Unsubscribe anytime. We&apos;ll only reach out when something real ships.
          </p>
        </div>
      </div>
    </section>
  );
}
