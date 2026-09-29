import type { ReactNode } from 'react';

import { Container } from '@/components/container';

/**
 * The standard opening for an interior page: one h1, and an optional single
 * line of lede. No rule beneath it — a rule under every page title is
 * decoration, and the brand rules reserve rules for dividing real things.
 */
export function PageHeader({
  title,
  lede,
  eyebrow,
  width = 'page',
}: {
  title: string;
  lede?: ReactNode;
  /** Used only where it carries information, such as an issue number. */
  eyebrow?: ReactNode;
  /**
   * Must match the container the page body uses. A heading in the wide
   * container above body copy in the reading container leaves the h1 and the
   * prose on two different left edges, which reads as a mistake.
   */
  width?: 'page' | 'reading';
}) {
  return (
    <Container width={width} className="pt-10 sm:pt-14">
      {eyebrow ? <p className="kicker kicker-muted mb-3">{eyebrow}</p> : null}
      <h1 className="max-w-[22ch] text-title font-semibold text-fg">{title}</h1>
      {lede ? (
        <div className="mt-3 max-w-reading text-subhead text-muted">{lede}</div>
      ) : null}
      {/* A rule under the masthead. The earlier note said a rule beneath every
          page title is decoration — that holds for a web page, but a
          publication's masthead is exactly where a rule carries meaning: it
          closes the title block and opens the content. */}
      <div className="mt-6 border-b border-rule" />
    </Container>
  );
}
