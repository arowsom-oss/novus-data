import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A boxed story: the unit every page is built from.
 *
 * Text sits on a raised panel with a rule across the top, the way a paper
 * boxes a story on its front page, rather than floating on the page ground.
 * The box is the whole grammar: a kicker saying what kind of thing this is, a
 * headline, an optional deck, the body, and a footer that carries the links
 * and dates. Keep to that order so every box reads the same way.
 *
 * Styling lives in `.story` in globals.css (layered, so a utility can still
 * adjust one box). §9 records why.
 */
export function StoryBox({
  as: Tag = 'article',
  size = 'standard',
  kicker,
  kickerTone = 'accent',
  title,
  titleHref,
  level = 3,
  id,
  deck,
  children,
  footer,
  className,
}: {
  /** `section` for a part of a page; `article` for a self-contained story. */
  as?: 'article' | 'section' | 'aside';
  /** `lead` is the front page's main story; `compact` is a rail or list box. */
  size?: 'lead' | 'standard' | 'compact';
  kicker?: ReactNode;
  kickerTone?: 'accent' | 'muted';
  title?: ReactNode;
  /** Makes the headline a link. Footer links stay separate targets. */
  titleHref?: string;
  level?: 1 | 2 | 3;
  /** Anchor id for the box, so a heading can be linked to. */
  id?: string;
  deck?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const Heading = `h${level}` as const;
  const headingId = id ? `${id}-title` : undefined;

  return (
    <Tag
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={clsx('story', size !== 'standard' && `story-${size}`, className)}
    >
      {kicker || title || deck ? (
        <header className="flex flex-col gap-2.5">
          {kicker ? (
            <p className={clsx('kicker', kickerTone === 'muted' && 'kicker-muted')}>{kicker}</p>
          ) : null}
          {title ? (
            <Heading id={headingId} className="story-title">
              {titleHref ? (
                <Link href={titleHref} className="transition-colors hover:text-link">
                  {title}
                </Link>
              ) : (
                title
              )}
            </Heading>
          ) : null}
          {deck ? <div className="story-deck">{deck}</div> : null}
        </header>
      ) : null}

      {children ? <div className="story-body">{children}</div> : null}

      {footer ? <footer className="story-foot">{footer}</footer> : null}
    </Tag>
  );
}

/**
 * A slim label that opens a band of boxes, like "Inside" on a front page.
 * It is a real heading so the page outline still reads in order.
 */
export function SectionLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="section-rule kicker kicker-muted">
      {children}
    </h2>
  );
}
