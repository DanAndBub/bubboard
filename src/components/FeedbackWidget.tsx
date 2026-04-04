'use client';

import { useState } from 'react';

type FeedbackType = 'Bug' | 'Suggestion' | 'Review';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('Suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const handleOpen = () => {
    setOpen(true);
    setStatus('idle');
    setErrorText('');
  };

  const handleClose = () => {
    setOpen(false);
    setMessage('');
    setEmail('');
    setType('Suggestion');
    setStatus('idle');
    setErrorText('');
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type.toLowerCase(), message, email }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('success');
      setTimeout(handleClose, 2000);
    } catch (err) {
      setStatus('error');
      setErrorText(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const types: FeedbackType[] = ['Bug', 'Suggestion', 'Review'];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label="Open feedback"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#3b82f6] hover:bg-blue-600 flex items-center justify-center shadow-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
          <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
          <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end pb-20 pr-6 sm:items-center sm:justify-center sm:pb-0 sm:pr-0">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          <div className="relative w-full max-w-sm bg-[#111820] border border-[#1e2a38] rounded-xl shadow-xl p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Send Feedback</span>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-[#34d399]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Thanks!</span>
              </div>
            ) : (
              <>
                {/* Type toggles */}
                <div className="flex gap-2">
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        type === t
                          ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                          : 'bg-transparent border-[#1e2a38] text-gray-400 hover:border-[#3b82f6] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="w-full bg-[#0b1017] border border-[#1e2a38] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#3b82f6] transition-colors"
                />

                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full bg-[#0b1017] border border-[#1e2a38] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3b82f6] transition-colors"
                />

                {/* Error */}
                {status === 'error' && (
                  <p className="text-[#f87171] text-xs">{errorText}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'loading'}
                  className="w-full py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
