'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LandingDemo from '@/components/LandingDemo';
import CompactDemo from '@/components/CompactDemo';
import WaitlistForm from '@/components/WaitlistForm';
import Footer from '@/components/Footer';


export default function HomePage() {


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
            Agent configs drift.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              Now you can see exactly where.
            </span>
          </h1>
          <p className="text-[#b0bec9] text-base max-w-lg mx-auto mt-3">
            Scan your OpenClaw workspace. See config drift, find truncation risks, track costs — all in your browser.
          </p>
        </div>

        {/* INTERACTIVE DEMO */}
        <div className="px-6 pb-12">
          <div className="max-w-6xl mx-auto relative">
            {/* Floating badge */}
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #a78bfa)' }}
            >
              ✦ Interactive Demo
            </div>

            {/* Live demo — full app on desktop, compact on mobile */}
            <div className="hidden md:block">
              <LandingDemo />
            </div>
            <div className="md:hidden">
              <div className="rounded-2xl border border-[#506880] bg-[#111827] overflow-hidden p-4" style={{ boxShadow: '0 0 80px rgba(59,130,246,0.08), 0 8px 40px rgba(0,0,0,0.6)' }}>
                <CompactDemo />
              </div>
            </div>
          </div>
        </div>

        {/* TRUNCATION CALLOUT */}
        <div className="px-6 pb-10">
          <div className="max-w-2xl mx-auto rounded-xl border border-[#7db8fc]/30 bg-[#7db8fc]/5 px-8 py-6">
            <p className="text-[#7db8fc] text-base leading-relaxed text-center">
              OpenClaw cuts the middle of oversized files &mdash; your agent sees a marker,
              but you get no warning about what was lost. We show you exactly which
              lines your agent can&rsquo;t see.
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
