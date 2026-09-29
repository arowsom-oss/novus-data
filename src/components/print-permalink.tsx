import { env } from '@/lib/env';

/**
 * The page's permanent address, printed only on paper.
 *
 * WHY. A PDF of a register entry travels further than the entry does — it gets
 * forwarded, attached to a note, put in front of someone who never saw the
 * site. An assessment arriving that way with no address is one nobody can go
 * and check, and being checkable is the only thing this register promises
 * (§6a). So the URL goes on the printed page, where the link it came from
 * cannot.
 *
 * Two deliberate restraints:
 *
 * - **Nothing renders until the site URL is really configured.** `env.siteUrl`
 *   falls back to `$VERCEL_URL` and then to localhost, and printing
 *   `http://localhost:3000/...` as a permanent address would be worse than
 *   printing nothing. `siteUrlIsConfigured` is the difference between a real
 *   value and a fallback.
 * - **No "retrieved on" date.** Every page here is static, so the only date
 *   available at render is the build's, not the reader's — and a retrieval
 *   date that is actually a build date is a false provenance claim. The review
 *   date already on the page is the honest one.
 */
export function PrintPermalink({ path, className }: { path: string; className?: string }) {
  if (!env.siteUrlIsConfigured) return null;

  return (
    <p className={`hidden max-w-measure text-meta text-muted print:block ${className ?? ''}`}>
      {/* The URL is deliberately plain text rather than a link: on paper a
          link is just its own text, and an <a> here would also pick up the
          `a[href^="http"]::after` rule in globals.css and print twice. */}
      Permanent address: {env.siteUrl}
      {path}
    </p>
  );
}
