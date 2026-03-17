export default function Footer() {
  return (
    <footer className="border-t border-[#506880] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <div className="w-6 h-6 rounded bg-[#7db8fc]/20 border border-[#7db8fc]/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="font-bold text-[#f1f5f9]">Driftwatch</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-xs text-[#7a8a9b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] status-dot-ok" />
            Built by Bub and UncleD
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#506880] text-center text-xs text-[#7a8a9b]">
          © {new Date().getFullYear()} Driftwatch
        </div>
      </div>
    </footer>
  );
}
