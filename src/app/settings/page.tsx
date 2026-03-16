'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { checkAdminAvailability } from '@/lib/cost-tracking/reconciliation';

type KeyStatus = 'checking' | 'connected' | 'not_configured';

export default function SettingsPage() {
  const [anthropicStatus, setAnthropicStatus] = useState<KeyStatus>('checking');
  const [openaiStatus, setOpenaiStatus] = useState<KeyStatus>('checking');

  useEffect(() => {
    checkAdminAvailability().then(({ anthropic, openai }) => {
      setAnthropicStatus(anthropic ? 'connected' : 'not_configured');
      setOpenaiStatus(openai ? 'connected' : 'not_configured');
    });
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0e17' }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#506880]"
        style={{ backgroundColor: '#111827' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#f1f5f9]">Driftwatch</span>
          <div className="flex items-center gap-6 text-sm text-[#b0bec9]">
            <Link href="/" className="hover:text-[#f1f5f9] transition-colors">Home</Link>
            <Link href="/map" className="hover:text-[#f1f5f9] transition-colors">Map</Link>
            <Link href="/cost-tracking" className="hover:text-[#f1f5f9] transition-colors">Cost Tracking</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Settings</h1>
        <p className="text-sm text-[#7a8a9b] mt-1">
          Configure admin API keys for cost reconciliation
        </p>

        {/* Info box */}
        <div className="mt-8 rounded-xl border border-[#7db8fc]/20 bg-[#7db8fc]/5 p-4 text-sm text-[#b0bec9]">
          Admin keys provide read-only access to your organization usage data. They cannot make API
          calls or access conversation content. Keys are stored as server-side environment variables
          in Vercel — they never reach the browser.
        </div>

        {/* Key cards */}
        <div className="space-y-6 mt-8">
          {/* Anthropic Admin Key */}
          <KeyCard
            title="Anthropic Admin API"
            status={anthropicStatus}
            description="Set ANTHROPIC_ADMIN_KEY in your Vercel environment variables. Get your admin key from console.anthropic.com → Organization Settings → Admin API Keys."
            envExample="ANTHROPIC_ADMIN_KEY=sk-ant-admin-..."
          />

          {/* OpenAI Admin Key */}
          <KeyCard
            title="OpenAI Admin API"
            status={openaiStatus}
            description="Set OPENAI_ADMIN_KEY in your Vercel environment variables. Get your admin key from platform.openai.com → Organization → Admin API Keys."
            envExample="OPENAI_ADMIN_KEY=sk-admin-..."
          />
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/cost-tracking"
            className="text-sm text-[#7db8fc] hover:text-blue-300 transition-colors"
          >
            ← Back to Cost Tracking
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: KeyStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#7a8a9b]">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Checking...
      </span>
    );
  }

  if (status === 'connected') {
    return (
      <span className="text-xs text-[#34d399] border border-green-500/30 bg-green-500/10 rounded-full px-2.5 py-0.5">
        ✓ Connected
      </span>
    );
  }

  return (
    <span
      className="text-xs text-[#7a8a9b] border border-[#506880] rounded-full px-2.5 py-0.5"
      style={{ backgroundColor: '#0a0e17' }}
    >
      Not configured
    </span>
  );
}

function KeyCard({
  title,
  status,
  description,
  envExample,
}: {
  title: string;
  status: KeyStatus;
  description: string;
  envExample: string;
}) {
  return (
    <div className="rounded-xl border border-[#506880] p-6" style={{ backgroundColor: '#111827' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#f1f5f9]">{title}</span>
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-[#7a8a9b] mt-4">{description}</p>
      <div
        className="mt-3 rounded-lg border border-[#506880] px-4 py-3 font-mono text-xs text-[#b0bec9]"
        style={{ backgroundColor: '#0a0e17' }}
      >
        {envExample}
      </div>
    </div>
  );
}
