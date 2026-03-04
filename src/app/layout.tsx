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
  title: 'BubBoard — See Inside Your OpenClaw Agent',
  description:
    'Interactive architecture map for OpenClaw AI agents. Visualize your agent\'s files, models, skills, and configuration in seconds.',
  keywords: ['OpenClaw', 'AI agent', 'architecture map', 'agent monitoring', 'LLM'],
  openGraph: {
    title: 'BubBoard — See Inside Your OpenClaw Agent',
    description:
      'Interactive architecture map for OpenClaw AI agents. Visualize your agent\'s files, models, skills, and configuration in seconds.',
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
