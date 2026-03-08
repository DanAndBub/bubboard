'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navBtn = 'px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all';
const activeBtn = `${navBtn} border-blue-500/30 bg-blue-500/10 text-blue-400`;
const inactiveBtn = `${navBtn} border-[#1e293b] bg-transparent text-[#94a3b8] hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400`;

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 border-b border-[#1e293b]/80 bg-[#0a0e17]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="font-bold text-[#e2e8f0]">Driftwatch</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/map"
            className={pathname === '/map' ? activeBtn : inactiveBtn}
          >
            Agent Map
          </Link>
          <Link
            href="/cost-tracking"
            className={pathname === '/cost-tracking' ? activeBtn : inactiveBtn}
          >
            Cost Tracking
          </Link>
          <a
            href="https://github.com/DanAndBub/bubboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#475569] hover:text-[#94a3b8] transition-colors hidden sm:block"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
