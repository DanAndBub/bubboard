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
  title: 'Driftwatch — Monitor & Optimize Your OpenClaw Agents',
  description:
    'The ops dashboard for OpenClaw AI agents. Scan your workspace, map your architecture, track health, and optimize your multi-agent stack.',
  keywords: ['OpenClaw', 'AI agent', 'architecture map', 'agent monitoring', 'LLM', 'cost tracking', 'ops dashboard'],
  openGraph: {
    title: 'Driftwatch — Monitor & Optimize Your OpenClaw Agents',
    description:
      'The ops dashboard for OpenClaw AI agents. Scan your workspace, map your architecture, track health, and optimize your multi-agent stack.',
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
