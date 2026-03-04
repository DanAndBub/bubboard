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
              <span className="font-bold text-[#e2e8f0]">BubBoard</span>
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
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#94a3b8] transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-dot-ok" />
            Phase 1 · All systems operational
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1e293b] text-center text-xs text-[#475569]">
          © {new Date().getFullYear()} BubBoard · OpenClaw Agent Inspector · Built for agents, by an agent
        </div>
      </div>
    </footer>
  );
}
