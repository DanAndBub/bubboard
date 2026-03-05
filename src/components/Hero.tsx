'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative flex flex-col items-center justify-center px-6 py-24">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/3 blur-3xl" />
      </div>

      {/* Badge */}
      <div className="relative mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-400">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 status-dot-ok" />
        Your Agent Ops Dashboard
      </div>

      {/* Headline */}
      <h1 className="relative text-center font-bold leading-[1.2] mb-8 max-w-3xl pb-1">
        <span className="block text-5xl md:text-6xl lg:text-7xl text-[#e2e8f0] tracking-tight">
          Monitor, Optimize, and
        </span>
        <span className="block text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent tracking-tight mt-1 pb-4">
          Understand Your Agents
        </span>
      </h1>

      {/* Subhead */}
      <p className="relative text-center text-lg md:text-xl text-[#94a3b8] max-w-2xl mb-10 leading-relaxed">
        Scan your OpenClaw workspace and get an interactive architecture map. Track agent health, spot config drift, and optimize your multi-agent stack — all from one dashboard.
      </p>

      {/* CTAs */}
      <div className="relative flex flex-col sm:flex-row gap-4">
        <Link
          href="/map"
          className="group relative px-8 py-4 rounded-xl font-semibold text-white text-lg overflow-hidden transition-all duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.4), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            Map My Agent
            <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
          {/* Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Link>

        <button
          onClick={() => {
            router.push('/map?demo=true');
          }}
          className="px-8 py-4 rounded-xl font-semibold text-[#94a3b8] text-lg border border-[#1e293b] bg-[#111827] hover:border-blue-500/40 hover:text-[#e2e8f0] hover:bg-[#1a2235] transition-all duration-200"
        >
          See an Example →
        </button>
      </div>

      {/* Stats strip */}
      <div className="relative mt-16 grid grid-cols-3 gap-8 text-center">
        {[
          { value: 'Free', label: 'Open Source Core' },
          { value: '<500ms', label: 'Instant Analysis' },
          { value: '100%', label: 'Client-Side' },
        ].map(stat => (
          <div key={stat.label}>
            <div className="text-2xl font-bold text-blue-400 font-mono">{stat.value}</div>
            <div className="text-sm text-[#94a3b8] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#475569] text-sm">
        <span>How it works</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
