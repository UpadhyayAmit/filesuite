import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { JetBrains_Mono, Sora } from 'next/font/google';
import './globals.css';
import { CookieConsent } from '@/components/CookieConsent';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { CLERK_CONFIGURED } from '@/lib/clerkConfig';

const siteUrl = 'https://www.filesuite.dev';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'filesuite.dev',
  description: 'Private browser-first developer utilities for JSON, JWT, encoding, timestamps, diffs, API data, files, and AI engineering workflows.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'filesuite.dev',
    description: 'Private browser-first developer utilities for JSON, JWT, encoding, timestamps, diffs, API data, files, and AI engineering workflows.',
    url: siteUrl,
    siteName: 'File Suite',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shell = (
    <html lang="en" className={`${sora.variable} ${jetBrainsMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );

  return CLERK_CONFIGURED ? <ClerkProvider appearance={clerkAppearance}>{shell}</ClerkProvider> : shell;
}
