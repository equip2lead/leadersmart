import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LeaderSmart — Transform Your Ministry Operations',
    template: '%s | LeaderSmart',
  },
  description:
    'Everything senior pastors, department heads, and volunteers need to run a ministry in excellence — Sunday after Sunday. Pastoral accountability platform for churches worldwide.',
  keywords: [
    'church management',
    'pastor evaluation',
    'ministry operations',
    'church software',
    'WhatsApp church',
    'kids check-in',
    'pastoral accountability',
  ],
  authors: [{ name: 'DigiSmart Africa' }],
  creator: 'DigiSmart Africa',
  openGraph: {
    type: 'website',
    title: 'LeaderSmart — Transform Your Ministry Operations',
    description:
      'Pastoral accountability platform for churches worldwide. Sunday checklists, weekly plans, department coordination, WhatsApp native.',
    siteName: 'LeaderSmart',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
