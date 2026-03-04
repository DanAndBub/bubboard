export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      ),
      title: 'Scan Your Workspace',
      description:
        'Point BubBoard at your OpenClaw directory. We check ~30 specific files by name — no recursive scanning, no uploads.',
    },
    {
      number: '02',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Review & Enrich',
      description:
        'Toggle on file content reading to auto-populate agent roles, delegation rules, and config details. Or keep it filenames-only for a quick structural overview.',
    },
    {
      number: '03',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: 'Explore Your Map',
      description:
        'See your agents, workspace files, skills, and relationships in one interactive dashboard. Spot missing protocols, check your health score, and understand your architecture at a glance.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1e293b] bg-[#111827] text-sm text-[#94a3b8] mb-4">
            <span className="w-1 h-1 rounded-full bg-[#94a3b8]" />
            How it works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#e2e8f0] mb-4">
            Three steps to clarity
          </h2>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            From directory tree to interactive map in seconds. No signup, no server access.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative p-6 rounded-xl border border-[#1e293b] bg-[#111827] card-hover"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 right-0 translate-x-full w-6 h-px bg-gradient-to-r from-[#1e293b] to-transparent z-10" />
              )}

              {/* Number */}
              <div className="text-xs font-mono text-blue-500/60 mb-4 tracking-widest">
                {step.number}
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-lg border border-[#1e293b] bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-[#e2e8f0] font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
