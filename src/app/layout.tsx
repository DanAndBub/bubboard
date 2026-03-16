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
  title: 'Driftwatch — Config Intelligence for OpenClaw Agents',
  description: 'Scan your OpenClaw workspace to find config drift, truncation risks, cost anomalies, and contradictions. All client-side, open source.',
  keywords: ['OpenClaw', 'AI agent', 'config drift', 'architecture map', 'agent monitoring', 'LLM cost tracking', 'truncation detection'],
  openGraph: {
    title: 'Driftwatch — Config Intelligence for OpenClaw Agents',
    description: 'Find what changed in your agent configs before it costs you. Scan → Review → Fix → Track.',
    type: 'website',
    url: 'https://bubbuilds.com',
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
