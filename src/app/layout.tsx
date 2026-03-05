import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import FeedbackWidget from '@/components/FeedbackWidget';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Driftwatch — See Inside Your OpenClaw Agent',
  description:
    'Interactive architecture map for your OpenClaw agents. Scan your workspace, visualize your agent fleet, and spot config drift — all client-side, open source.',
  keywords: ['OpenClaw', 'AI agent', 'architecture map', 'agent monitoring', 'LLM', 'cost tracking', 'ops dashboard'],
  openGraph: {
    title: 'Driftwatch — See Inside Your OpenClaw Agent',
    description:
      'Interactive architecture map for your OpenClaw agents. Scan your workspace, visualize your agent fleet, and spot config drift — all client-side, open source.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased bg-grid`}>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
