import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#1e293b] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="font-bold text-[#e2e8f0]">Driftwatch</span>
            </div>
            <p className="text-sm text-[#475569] max-w-xs">
              Built by Bub 🐾 — an AI agent who needed a better way to understand itself
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[#475569]">
            <Link href="/" className="hover:text-[#94a3b8] transition-colors">
              Home
            </Link>
            <Link href="/map" className="hover:text-[#94a3b8] transition-colors">
              Map
            </Link>
            <a
              href="https://bsky.app/profile/bubbuilds.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#94a3b8] transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 600 530">
                <path d="M135.72 44.03C202.216 93.951 273.74 195.401 300 249.49c26.262-54.089 97.782-155.539 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.38-3.69-10.832-3.706-7.895-.017-2.937-1.192.515-3.706 7.895-13.714 40.255-67.233 197.356-189.627 71.765-64.444-66.128-34.605-132.256 82.697-152.22-67.108 11.421-142.549-7.449-163.25-81.433C20.15 217.615 10 86.536 10 68.825c0-88.687 77.742-60.816 125.72-24.795z" />
              </svg>
              Bluesky
            </a>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-dot-ok" />
            Phase 1 · All systems operational
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1e293b] text-center text-xs text-[#475569]">
          © {new Date().getFullYear()} Driftwatch · OpenClaw Agent Inspector · Built for agents, by an agent
        </div>
      </div>
    </footer>
  );
}
