import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
// Imported for its side effect: refuses a production build while a
// launch-critical fact is still missing. Server-only by design.
import '@/config/input-ledger';
import { publication } from '@/config/publication';
import { env } from '@/lib/env';

import './globals.css';

/**
 * The site is set in one family, and figures are set in its monospace sibling.
 *
 * This reverses the serif/sans split §9 previously described, on the author's
 * instruction — the reasoning is recorded there. The short version: the thing
 * §9 actually blamed for the site reading as generated was *Inter*, the face a
 * generated page reaches for. Plex is the opposite of a default. It is a
 * corporate family with real quirks, and setting every figure in Plex Mono is
 * a terminal convention that no template does by accident.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-face',
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-face',
  // Only the weights figures are actually set in. Plex Mono ships many more
  // and each one is a request.
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  // Resolved from NEXT_PUBLIC_SITE_URL, then $VERCEL_URL, then localhost, so
  // preview deployments still emit correct absolute URLs.
  metadataBase: new URL(env.siteUrl),
  title: {
    default: publication.name,
    template: `%s — ${publication.name}`,
  },
  description: publication.description,
  applicationName: publication.name,
  openGraph: {
    type: 'website',
    siteName: publication.name,
    title: publication.name,
    description: publication.description,
    url: '/',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: publication.name,
    description: publication.description,
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-ink text-fg">
        {/* Feed discovery, declared as an element rather than through
            `metadata.alternates.types`.

            Next merges metadata per top-level field, so a page that sets its
            own `alternates` — and every page here sets `canonical` — replaces
            the layout's `alternates` object wholesale and drops `types` with
            it. Declared in the layout's tree instead, React hoists it into
            <head> on every route, which is what "site-wide" has to mean. */}
        <link
          rel="alternate"
          type="application/feed+json"
          href="/register.json"
          title="Novus Data — disruption register"
        />
        <link
          rel="alternate"
          type="application/feed+json"
          href="/feed.json"
          title="Novus Data — briefings, articles and reviews"
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-link focus:bg-surface focus:px-4 focus:py-3 focus:text-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
