'use client';

import { useSyncExternalStore } from 'react';

import { formatAge, formatUtc, formatUtcDate } from '@/lib/live/display';
// Pure modules only. The layer index reaches the network adapters, and a
// client component that imported it would drag them into the browser bundle.
import { SOURCE_CLOCKS } from '@/lib/live/clocks';
import { FRESHNESS_LABELS, freshnessFor, type LiveSourceId, type SourceClock } from '@/lib/live/types';

/**
 * A reading's time, and — once the page is in the reader's browser — its age.
 *
 * ---------------------------------------------------------------------------
 * WHY THE AGE IS COMPUTED HERE AND NOT ON THE SERVER
 *
 * The page is regenerated every fifteen minutes and served from a cache in
 * between, and a reader can leave the tab open for a day. An age rendered on
 * the server would be frozen at regeneration and could only ever understate
 * how old the data is — the dangerous direction, the same one §6a guards
 * against for review dates. So the server renders only the absolute time,
 * which is true forever, and the age is worked out against the reader's own
 * clock, at the moment they look, and kept ticking.
 *
 * The server HTML and the first client render are identical (no age), which
 * is what keeps hydration clean: `useSyncExternalStore` hands React a null
 * server snapshot and the real clock only afterwards.
 * ---------------------------------------------------------------------------
 */

const TICK_MS = 30_000;

let clock = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

// One interval for every LiveAge on the page, not one each.
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      clock = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  // Stable between ticks, as useSyncExternalStore requires.
  if (clock === 0) clock = Date.now();
  return clock;
}

function getServerSnapshot(): null {
  return null;
}

/** A reader's clock can be wrong. Beyond this much "in the future", say nothing rather than guess. */
const SKEW_TOLERANCE_MINUTES = 5;

export function LiveAge({
  at,
  source,
  precision = 'minute',
}: {
  at: string;
  /** When given, the source's own freshness windows decide Live / Delayed / Stale. */
  source?: LiveSourceId;
  /** The source's `asOfPrecision` (see ../../lib/live/clocks.ts). */
  precision?: SourceClock['asOfPrecision'];
}) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const then = Date.parse(at);

  let age: number | null = null;
  if (now !== null && Number.isFinite(then)) {
    const minutes = (now - then) / 60_000;
    age = minutes < -SKEW_TOLERANCE_MINUTES ? null : Math.max(0, minutes);
  }

  const freshness = age !== null && source ? freshnessFor(age, SOURCE_CLOCKS[source]) : null;

  return (
    <span>
      <time dateTime={at}>{precision === 'day' ? formatUtcDate(at) : formatUtc(at)}</time>
      {age !== null && precision === 'minute' ? (
        <>
          <span aria-hidden="true" className="text-accent">
            {' · '}
          </span>
          <span data-numeric>{formatAge(age)}</span> ago
        </>
      ) : null}
      {freshness ? (
        <>
          <span aria-hidden="true" className="text-accent">
            {' · '}
          </span>
          <span
            data-freshness={freshness}
            className={freshness === 'live' ? 'text-fg' : 'font-semibold text-fg'}
          >
            {FRESHNESS_LABELS[freshness]}
            {freshness === 'stale' ? ' — older than this feed normally is' : ''}
          </span>
        </>
      ) : null}
    </span>
  );
}
