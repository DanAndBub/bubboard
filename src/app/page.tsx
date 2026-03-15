'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentMap from '@/components/AgentMap';
import CompactDemo from '@/components/CompactDemo';
import { getDemoAgentMap } from '@/lib/demo-data';
import WaitlistForm from '@/components/WaitlistForm';
import Footer from '@/components/Footer';

const demoFileContents: Record<string, string> = {
  'SOUL.md': 'Voice: Direct and efficient. Genuinely helpful, not performatively helpful. Opinionated when it matters. Concise by default, thorough when it counts.',
  'HEARTBEAT.md': 'Background task runner. Checks email, calendar, weather 2-4x daily. Uses HEARTBEAT_OK for quiet periods. Monitors open loops across channels.',
  'AGENTS.md': 'Orchestration hierarchy: Bub (Opus) delegates to Sonnet (engineering lead), who manages Coder (DeepSeek). Analyst reports directly to Bub. Two-tier QA on all code.',
  'MEMORY.md': 'Curated long-term memory. Critical rules, architecture decisions, lessons learned. Updated weekly, trimmed monthly. Target size under 1500 tokens.',
  'TOOLS.md': 'GitHub CLI, Google Workspace (gog), Brave Search, web fetch, Claude Code CLI for heavy coding. Airtable for storage. Telegram for comms.',
  'USER.md': 'Dan — PST timezone, direct communicator, values efficiency. Business partner.',
  'IDENTITY.md': 'Bub — AI Business Partner and Operations Director. Orchestrate, automate, ship.',
};

export default function HomePage() {
  const demoMap = getDemoAgentMap();

  return (
    <main className="min-h-screen bg-[#0a0e17]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-[#506880]/80 bg-[#0a0e17]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border border-[#7db8fc]/30 bg-[#7db8fc]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-[#f1f5f9]">Driftwatch</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/cost-tracking"
              className="text-sm text-[#7a8a9b] hover:text-[#b0bec9] transition-colors"
            >
              Cost Tracking
            </Link>
            <a
              href="https://github.com/DanAndBub/bubboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#7a8a9b] hover:text-[#b0bec9] transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/map"
              className="px-4 py-1.5 rounded-lg border border-[#7db8fc]/30 bg-[#7db8fc]/10 text-[#7db8fc] hover:bg-[#7db8fc]/20 hover:border-blue-400 transition-all font-medium text-sm"
            >
              Scan Yours →
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* MINI BANNER */}
        <div className="text-center py-10 px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-[#f1f5f9]">
            Your agents edit their own configs.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              Do you know what they changed?
            </span>
          </h1>
          <p className="text-[#b0bec9] text-base max-w-lg mx-auto mt-3">
            Scan your OpenClaw workspace. See config drift, find truncation risks, track costs — all in your browser.
          </p>
        </div>

        {/* LIVE MAP SECTION */}
        <div className="px-6 pb-12">
          <div className="max-w-6xl mx-auto relative">
            {/* Floating badge */}
            <div
              className="absolute -top-3 right-8 z-10 text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #a78bfa)' }}
            >
              ✦ Interactive demo
            </div>

            {/* Map container */}
            <div
              className="rounded-2xl border border-[#506880] bg-[#111827] overflow-hidden"
              style={{ boxShadow: '0 0 80px rgba(59,130,246,0.08), 0 8px 40px rgba(0,0,0,0.6)' }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#506880] bg-[#0d1520]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 font-mono text-xs text-[#7a8a9b]">bubbuilds.com/map</span>
              </div>

              {/* Map content — full on desktop, compact on mobile */}
              <div className="hidden md:block p-6 overflow-hidden">
                <AgentMap map={demoMap} fileContents={demoFileContents} />
              </div>
              <div className="md:hidden p-4 overflow-hidden">
                <CompactDemo />
              </div>
            </div>
          </div>
        </div>

        {/* TRUNCATION CALLOUT */}
        <div className="px-6 pb-10">
          <div className="max-w-2xl mx-auto rounded-xl border border-[#7db8fc]/30 bg-[#7db8fc]/5 px-8 py-6">
            <p className="text-[#7db8fc] text-base leading-relaxed text-center">
              &ldquo;When files exceed OpenClaw&rsquo;s limits, the middle disappears silently.
              We show you exactly which lines your agent can&rsquo;t see.&rdquo;
            </p>
          </div>
        </div>

        {/* CTA SECTION */}
        <div className="py-12 px-6 text-center">
          <p className="text-[#b0bec9] text-lg mb-6">That was a demo. Now see yours.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/map"
              className="px-8 py-4 rounded-xl font-semibold text-white text-lg"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 0 30px rgba(59,130,246,0.4)',
              }}
            >
              Scan Your Workspace →
            </Link>
            <a
              href="https://github.com/DanAndBub/bubboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold text-[#b0bec9] text-lg border border-[#506880] bg-[#111827] hover:border-[#7db8fc]/40 hover:text-[#f1f5f9] transition-all"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* FEATURES STRIP */}
        <div className="py-8 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-[#7a8a9b] uppercase tracking-widest mb-4">What&rsquo;s available now</p>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {[
                '🗺 Architecture map',
                '🔍 Config review',
                '📊 Drift detection',
                '💰 Cost tracking',
                '✏️ In-browser editor',
              ].map((pill) => (
                <span
                  key={pill}
                  className="px-4 py-2 rounded-full border border-[#506880] bg-[#111827] text-sm text-[#b0bec9]"
                >
                  {pill}
                </span>
              ))}
            </div>
            <p className="text-sm text-[#7a8a9b] font-mono">
              <span className="text-[#7db8fc]">Scan</span>
              {' → '}
              <span className="text-[#7db8fc]">Review</span>
              {' → '}
              <span className="text-[#7db8fc]">Fix</span>
              {' → '}
              <span className="text-[#7db8fc]">Track</span>
            </p>
          </div>
        </div>

        {/* WAITLIST */}
        <div className="border-t border-[#506880]">
          <WaitlistForm />
        </div>

        {/* FOOTER */}
        <Footer />
      </div>
    </main>
  );
}
