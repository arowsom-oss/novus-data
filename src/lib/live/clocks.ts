/**
 * How each source's readings age: when one is shown as delayed, when as stale,
 * and whether its values carry a time or only a date.
 *
 * Pure data, safe anywhere — and deliberately separate from `SOURCE_META`,
 * which spreads these in, so the client component that ticks ages
 * (components/live/live-age.tsx) ships these numbers and nothing else.
 *
 * Windows are per source because cadences differ by orders of magnitude: a
 * vessel count is old after half an hour, a hurricane advisory is issued every
 * three to six hours, and EONET is curated daily.
 */

import type { LiveSourceId, SourceClock } from './types';

export const SOURCE_CLOCKS: Record<LiveSourceId, SourceClock> = {
  ais: { delayedAfterMinutes: 30, staleAfterMinutes: 90, asOfPrecision: 'minute' },
  gdelt: { delayedAfterMinutes: 45, staleAfterMinutes: 180, asOfPrecision: 'minute' },
  usgs: { delayedAfterMinutes: 30, staleAfterMinutes: 120, asOfPrecision: 'minute' },
  gdacs: { delayedAfterMinutes: 6 * 60, staleAfterMinutes: 48 * 60, asOfPrecision: 'minute' },
  nhc: { delayedAfterMinutes: 7 * 60, staleAfterMinutes: 24 * 60, asOfPrecision: 'minute' },
  eonet: { delayedAfterMinutes: 36 * 60, staleAfterMinutes: 7 * 24 * 60, asOfPrecision: 'minute' },
  weather: { delayedAfterMinutes: 45, staleAfterMinutes: 180, asOfPrecision: 'minute' },
  // A daily series is a business day behind by design, and a weekend adds
  // two more, so "delayed" starts after four days rather than hours.
  fred: { delayedAfterMinutes: 4 * 24 * 60, staleAfterMinutes: 8 * 24 * 60, asOfPrecision: 'day' },
  quotes: { delayedAfterMinutes: 24 * 60, staleAfterMinutes: 4 * 24 * 60, asOfPrecision: 'minute' },
};
