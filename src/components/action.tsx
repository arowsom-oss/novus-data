import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The site's one button treatment: a bordered box, not a filled pill, so it
 * reads as a control in a publication rather than a call to action in an ad.
 *
 * Tap target is at least 44px tall at every size (py-3 + line height).
 */
const shared =
  'inline-flex min-h-[2.875rem] items-center justify-center border px-5 py-3 font-sans text-[0.9375rem] font-medium transition-colors';

// Primary sits on --surface-2 so it still reads as a control inside a story
// box, which is itself --surface.
const variants = {
  primary: 'border-accent bg-surface-2 text-fg hover:border-link',
  quiet: 'border-rule bg-transparent text-fg hover:bg-surface-2 hover:border-accent',
} as const;

export type ActionVariant = keyof typeof variants;

export function ActionLink({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  className?: string;
}) {
  return (
    <Link href={href} className={clsx(shared, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function ExternalActionLink({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  className?: string;
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className={clsx(shared, variants[variant], className)}
    >
      {children}
    </a>
  );
}

/**
 * Shown in place of a subscribe control when no subscribe URL is configured.
 * A disabled control that explains itself beats a button that goes nowhere.
 */
export function UnavailableAction({ children }: { children: ReactNode }) {
  return (
    <span
      className={clsx(
        shared,
        'cursor-not-allowed border-dashed border-accent bg-transparent text-muted',
      )}
      aria-disabled="true"
    >
      {children}
    </span>
  );
}
