import clsx from 'clsx';

import { publication } from '@/config/publication';

/**
 * The wordmark is typographic: Plex Sans, semibold, tightened tracking.
 *
 * Deliberately **not** Plex Mono, even though the rest of the change leans
 * terminal. Mono is reserved for figures and for the kicker (§9), and a
 * wordmark set in it would read as a filename rather than as a masthead —
 * which is also the one place on the site where legibility at small sizes
 * matters most, since this is what appears in the header at 1rem.
 *
 * Tracking is -0.022em, not the -0.012em this carried before. That value was
 * measured against Newsreader; Plex Sans is drawn on a wider chassis and needs
 * roughly twice as much negative tracking to look equally resolved at the same
 * size. It matches --text-title in @theme.
 *
 * No logo file was supplied, and the existing Novus Data logo must not be
 * redrawn or approximated from memory. When the real file arrives it replaces
 * this component and the generated icons — see HANDOFF.md.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx('font-semibold tracking-[-0.022em] text-fg', className)}
    >
      {publication.name}
    </span>
  );
}
