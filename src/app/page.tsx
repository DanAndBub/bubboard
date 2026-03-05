import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import DemoPreview from '@/components/DemoPreview';
import FeaturesPreview from '@/components/FeaturesPreview';
import WaitlistForm from '@/components/WaitlistForm';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-[#1e293b]/80 bg-[#0a0e17]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-[#e2e8f0]">Driftwatch</span>
            <span className="hidden sm:inline text-xs text-[#475569] px-2 py-0.5 rounded-full border border-[#1e293b] bg-[#111827]">
              Open Source
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-4 text-sm text-[#475569]">
            <a href="#features" className="hover:text-[#94a3b8] transition-colors hidden sm:block">Features</a>
            <a href="#how-it-works" className="hover:text-[#94a3b8] transition-colors hidden sm:block">
              How it works
            </a>
            <a href="#demo" className="hover:text-[#94a3b8] transition-colors hidden sm:block">
              Demo
            </a>
            <a
              href="/map"
              className="px-4 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 transition-all font-medium"
            >
              Map My Agent
            </a>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="pt-14">
        <Hero />

        <div id="how-it-works">
          <HowItWorks />
        </div>

        <div id="demo" className="border-t border-[#1e293b]">
          <DemoPreview />
        </div>

        <div id="features" className="border-t border-[#1e293b]">
          <FeaturesPreview />
        </div>

        <div className="border-t border-[#1e293b]">
          <WaitlistForm />
        </div>

        <Footer />
      </div>
    </main>
  );
}
