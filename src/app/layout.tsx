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
    default: 'LeaderSmart — Ministry Operations Platform for African Churches',
    template: '%s | LeaderSmart',
  },
  description:
    'The platform African churches use to run Sunday operations, schedule volunteers on WhatsApp, check in kids safely, and turn pastoral excellence into a measurable discipline.',
  keywords: [
    'church management',
    'pastor evaluation',
    'ministry operations',
    'African church software',
    'WhatsApp church',
    'kids check-in',
  ],
  authors: [{ name: 'DigiSmart Africa' }],
  creator: 'DigiSmart Africa',
  openGraph: {
    type: 'website',
    title: 'LeaderSmart',
    description: 'Ministry operations and pastoral accountability platform for African churches.',
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
