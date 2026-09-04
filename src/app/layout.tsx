import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

// Inter carries body copy everywhere, and headings everywhere except
// the marketing landing. Loaded as a variable font so every weight
// 100–900 is available without additional payload.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: 'variable',
});

// Manrope is the landing page's display face — the wordmark and every
// headline. Exposed only through the `.font-manrope` utility so the
// authenticated app keeps Inter headings untouched. Its variable axis
// tops out at 800, so `font-black` renders as ExtraBold rather than a
// synthesised 900; that is the intended weight for the wordmark.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: 'variable',
});

export const metadata: Metadata = {
  title: {
    default: 'Equip2Lead Coach — Transform Your Ministry Operations',
    template: '%s | Equip2Lead Coach',
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
    title: 'Equip2Lead Coach — Transform Your Ministry Operations',
    description:
      'Pastoral accountability platform for churches worldwide. Sunday checklists, weekly plans, department coordination, WhatsApp native.',
    siteName: 'Equip2Lead Coach',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A1E3F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
