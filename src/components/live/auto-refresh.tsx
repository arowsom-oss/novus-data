'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Keeps an open page current without a reload.
 *
 * The server re-reads every source every fifteen minutes (the page's
 * `revalidate = 900`). This is the other half: a tab left open asks the server
 * for the current version on a shorter cycle, so a new reading reaches the
 * reader within minutes of existing rather than whenever they next reload.
 *
 * Why five minutes when the data moves every fifteen. A regeneration is only
 * started by a request that finds the page stale, and it takes a little while
 * to finish (the vessel sample alone is thirty seconds). Checking on the
 * same fifteen-minute cycle can therefore land just before a new version
 * exists and show it a full cycle late. Each check between regenerations is a
 * cache hit that costs next to nothing.
 *
 * `router.refresh()` swaps in the new server render in place: scroll position
 * and focus survive, and nothing flashes. A hidden tab does not poll at all;
 * it refreshes once when the reader comes back, if a check is due.
 */
const EVERY_MS = 5 * 60_000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, EVERY_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - last >= EVERY_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  return null;
}
