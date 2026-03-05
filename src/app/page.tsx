'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentMap from '@/components/AgentMap';
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
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-[#1e293b]/80 bg-[#0a0e17]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-[#e2e8f0]">Driftwatch</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/DanAndBub/bubboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/map"
              className="px-4 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 transition-all font-medium text-sm"
            >
              Scan Yours →
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* MINI BANNER */}
        <div className="text-center py-10 px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-[#e2e8f0]">
            See inside your{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              OpenClaw agent
            </span>
          </h1>
          <p className="text-[#94a3b8] text-base max-w-lg mx-auto mt-3">
            This is a real architecture map. Click around — then scan your own.
          </p>
        </div>

        {/* LIVE MAP SECTION */}
        <div className="px-6 pb-12">
          <div className="max-w-6xl mx-auto relative">
            {/* Floating badge */}
            <div
              className="absolute -top-3 right-8 z-10 text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
            >
              ✦ Interactive demo
            </div>

            {/* Map container */}
            <div
              className="rounded-2xl border border-[#1e293b] bg-[#111827] overflow-hidden"
              style={{ boxShadow: '0 0 80px rgba(59,130,246,0.08), 0 8px 40px rgba(0,0,0,0.6)' }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e293b] bg-[#0d1520]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 font-mono text-xs text-[#475569]">bubbuilds.com/map</span>
              </div>

              {/* Map content */}
              <div className="p-4 sm:p-6 overflow-hidden">
                <AgentMap map={demoMap} fileContents={demoFileContents} />
              </div>
            </div>
          </div>
        </div>

        {/* CTA SECTION */}
        <div className="py-12 px-6 text-center">
          <p className="text-[#94a3b8] text-lg mb-6">That was a demo. Now see yours.</p>
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
              className="px-8 py-4 rounded-xl font-semibold text-[#94a3b8] text-lg border border-[#1e293b] bg-[#111827] hover:border-blue-500/40 hover:text-[#e2e8f0] transition-all"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* ROADMAP STRIP */}
        <div className="py-8 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-[#475569] uppercase tracking-widest mb-4">Coming in Phase 2</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {['💰 Cost Tracking', '🔔 Optimization Alerts', '📈 Drift Analysis', '👥 Team Dashboards'].map((pill) => (
                <span
                  key={pill}
                  className="px-4 py-2 rounded-full border border-[#1e293b] bg-[#111827] text-sm text-[#94a3b8]"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* WAITLIST */}
        <div className="border-t border-[#1e293b]">
          <WaitlistForm />
        </div>

        {/* FOOTER */}
        <Footer />
      </div>
    </main>
  );
}
