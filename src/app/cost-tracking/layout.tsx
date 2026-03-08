import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cost Tracking — Driftwatch',
  description: 'Track and analyze your AI agent API costs. Supports Claude, GPT, DeepSeek and more. All data stays in your browser.',
}

export default function CostTrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
