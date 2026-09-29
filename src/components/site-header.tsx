import { SiteNav } from '@/components/site-nav';

/**
 * Not sticky, deliberately. A masthead that stays out of the way suits a
 * publication; a persistent bar suits an application. It also keeps the
 * reading column clear of a translucent overlay, which the brand rules out.
 *
 * Hidden in print: a navigation bar on paper is a list of places the reader
 * cannot go. The footer keeps the wordmark and the disclaimer so a printed
 * page still says which publication it came from.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-hairline print:hidden">
      <SiteNav />
    </header>
  );
}
