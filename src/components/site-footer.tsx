import Link from 'next/link';

import { Container } from '@/components/container';
import { ExternalLink } from '@/components/text-link';
import { Wordmark } from '@/components/wordmark';
import { footerNav } from '@/config/nav';
import { publication } from '@/config/publication';
import { env } from '@/lib/env';

export function SiteFooter() {
  // Computed at render. The site is statically generated, so in practice this
  // is the year of the most recent deploy — and issues deploy regularly.
  const year = new Date().getUTCFullYear();

  const externalLinks = [
    env.beehiivHomeUrl ? { href: env.beehiivHomeUrl, label: 'Read on Beehiiv' } : null,
    env.beehiivFeedUrl ? { href: env.beehiivFeedUrl, label: 'RSS feed' } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <footer className="mt-24 border-t border-hairline print:mt-8">
      <Container className="py-12 sm:py-16 print:py-5">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-sm">
            <Wordmark className="text-[1.125rem]" />
            <p className="mt-3 text-[0.9375rem] text-muted">{publication.shortDescription}</p>
          </div>

          {/* Hidden in print. Everything in here is a link, and a link is
              the one thing paper cannot honour — whereas the wordmark and the
              disclaimer below are exactly what a forwarded page needs. */}
          <nav aria-label="Footer" className="print:hidden">
            {/* Columns rather than one long list: thirteen links stacked in a
                single column read as a sitemap dump. min-h-11 keeps every link
                a 44px tap target. */}
            <ul className="grid grid-cols-2 gap-x-10 sm:grid-cols-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-[0.9375rem] text-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {externalLinks.map((link) => (
                <li key={link.href}>
                  <ExternalLink standalone href={link.href} className="text-[0.9375rem]">
                    {link.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-hairline pt-6">
          <p className="text-meta text-muted">{publication.disclaimer}</p>
          <p className="mt-2 text-meta text-muted">
            <span data-numeric>&copy; {year}</span> {publication.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
