'use client'

export default function FeaturesPreview() {
  return (
    <section style={{ backgroundColor: '#0a0e17' }} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 mb-6">
            On the Roadmap
          </span>
          <h2 className="text-3xl font-bold text-[#e2e8f0] mb-4">
            Built for agent operators
          </h2>
          <p className="text-[#94a3b8] max-w-xl">
            The map is just the beginning. Driftwatch is becoming the ops layer for multi-agent systems.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cost Tracking */}
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
            <div className="w-10 h-10 rounded-lg border border-[#1e293b] bg-green-500/10 text-green-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-2">Cost Tracking</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">
              See exactly what each agent costs per task. Break down spending by model, role, and time period. Stop guessing where your API budget goes.
            </p>
            <span className="text-xs text-amber-400/70">Coming soon</span>
          </div>

          {/* Optimization Alerts */}
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
            <div className="w-10 h-10 rounded-lg border border-[#1e293b] bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-2">Optimization Alerts</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">
              Get notified when an agent is using an expensive model for cheap tasks, or when config drift creates inefficiencies in your stack.
            </p>
            <span className="text-xs text-amber-400/70">Coming soon</span>
          </div>

          {/* Historical Analysis */}
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
            <div className="w-10 h-10 rounded-lg border border-[#1e293b] bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            </div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-2">Historical Analysis</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">
              Track how your agent architecture evolves over time. See when configs changed, costs spiked, or new agents were added.
            </p>
            <span className="text-xs text-amber-400/70">Coming soon</span>
          </div>

          {/* Team Dashboards */}
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
            <div className="w-10 h-10 rounded-lg border border-[#1e293b] bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-2">Team Dashboards</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">
              Multi-user views for teams running shared agent infrastructure. Role-based access, shared maps, collaborative optimization.
            </p>
            <span className="text-xs text-amber-400/70">Coming soon</span>
          </div>
        </div>
      </div>
    </section>
  )
}
