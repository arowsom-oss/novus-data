import type { ReactNode } from 'react';

import { LiveAge } from '@/components/live/live-age';
import { ExternalLink } from '@/components/text-link';
import { SOURCE_META } from '@/lib/live/meta';
import type { Reading } from '@/lib/live/types';

/**
 * The frame around every live panel: whose data it is, when that data was
 * produced, and — when there is none — why.
 *
 * A Reading has exactly three shapes, and this renders each one plainly:
 *
 *   ok              the panel, preceded by its source and as-of time, and
 *                   followed by any caveats the adapter raised
 *   unavailable     one sentence saying so and why. No placeholder, no last
 *                   known value presented as current, no zero.
 *   not-configured  says the source is not switched on. The variable that
 *                   switches it on is named only outside production, where
 *                   the reader is the person who can set it.
 *
 * Empty is better than invented (Rule 1). A panel with no data says it has
 * none; it never draws a chart of nothing.
 */
export function ReadingBlock<T>({
  reading,
  children,
}: {
  reading: Reading<T>;
  children: (data: T) => ReactNode;
}) {
  const meta = SOURCE_META[reading.source];

  return (
    <div>
      <p className="text-meta text-muted">
        Source: <ExternalLink href={meta.homepage}>{meta.name}</ExternalLink>, {meta.publisher}.
        {reading.status === 'ok' ? (
          <>
            {' '}
            Data as of{' '}
            <LiveAge
              at={reading.asOf}
              source={reading.source}
              precision={meta.asOfPrecision}
            />{' '}
            — {reading.asOfBasis}.
          </>
        ) : null}
      </p>

      {reading.status === 'ok' ? (
        <>
          <div className="mt-4">{children(reading.data)}</div>
          {reading.notes.length > 0 ? (
            <ul className="mt-4 space-y-1 text-meta text-muted">
              {reading.notes.map((note) => (
                <li key={note} className="max-w-[72ch] border-l-2 border-rule pl-3">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : reading.status === 'unavailable' ? (
        <p className="mt-4 max-w-[72ch] border-l-2 border-rule pl-3 text-[0.9375rem] text-muted">
          <span className="font-semibold text-fg">Unavailable at the last update.</span> {reading.reason}{' '}
          Nothing is shown in its place; the panel returns when the source does.
        </p>
      ) : (
        <p className="mt-4 max-w-[72ch] border-l-2 border-rule pl-3 text-[0.9375rem] text-muted">
          <span className="font-semibold text-fg">Not switched on yet.</span> This source needs an
          access key that has not been added to the site.
          {process.env.NODE_ENV !== 'production' ? (
            <>
              {' '}
              <span className="text-fg">
                Development note: set <code data-numeric>{reading.envVar}</code> in{' '}
                <code data-numeric>.env.local</code> — server only, never with a{' '}
                <code data-numeric>NEXT_PUBLIC_</code> prefix — and restart. See DEPLOY.md.
              </span>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
