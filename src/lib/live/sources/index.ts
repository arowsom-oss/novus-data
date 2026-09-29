/**
 * Chooses where live readings come from, and assembles the snapshot.
 *
 * CONTENT_SOURCE=fixtures means the same thing here as it does for the issue
 * archive and the register, so `npm run dev:demo` populates every page at
 * once. Deciding it here is also what puts ./fixtures in the import graph, and
 * so what makes its production guard fire.
 *
 * ---------------------------------------------------------------------------
 * ISOLATION
 *
 * Every source is settled independently. A feed that is down, slow, rate
 * limited or reshaped becomes one panel saying "unavailable" and why — it
 * never throws out of here, never delays the others beyond its own timeout,
 * and never takes the page with it. `Promise.all` over settled promises is
 * safe for exactly that reason.
 * ---------------------------------------------------------------------------
 */

import { MARKET_SYMBOLS, type MarketSymbol } from '@/config/markets';

import { SOURCE_META } from '../meta';
import type { LiveSnapshot, LiveSourceId, Reading } from '../types';
import { fetchAis, parseAis } from './ais';
import { fetchEonet, parseEonet } from './eonet';
import * as fixtures from './fixtures';
import { fetchFred, parseFred } from './fred';
import { fetchGdacs, parseGdacs } from './gdacs';
import { fetchGdelt, parseGdelt } from './gdelt';
import { LiveSourceError } from './http';
import { fetchNhc, parseNhc } from './nhc';
import { fetchQuotes, parseQuotes } from './quotes';
import { fetchUsgs, parseUsgs } from './usgs';
import { fetchWeather, parseWeather } from './weather';

export type LiveSourceName = 'network' | 'fixtures';

export function getLiveSourceName(): LiveSourceName {
  return process.env.CONTENT_SOURCE === 'fixtures' ? 'fixtures' : 'network';
}

async function settle<T>(source: LiveSourceId, run: () => Promise<Reading<T>>): Promise<Reading<T>> {
  try {
    return await run();
  } catch (error) {
    const reason =
      error instanceof LiveSourceError
        ? error.publicReason
        : `${SOURCE_META[source].name} could not be read.`;
    // The reason is always a sentence this layer wrote, so it is safe to log.
    console.warn(`[live] ${source}: ${reason}`);
    return { status: 'unavailable', source, reason };
  }
}

/**
 * Runs a keyed source with the secret from the variable its SOURCE_META entry
 * names, or reports it not configured. Server-only: the key is read here,
 * passed to the adapter, and never stored in a Reading.
 */
async function withKey<T>(source: 'ais' | 'quotes', run: (key: string) => Promise<Reading<T>>): Promise<Reading<T>> {
  const envVar = SOURCE_META[source].requiresEnv!;
  const key = process.env[envVar]?.trim();
  return key ? run(key) : { status: 'not-configured', source, envVar };
}

/** The configured funds, then any extra symbols the caller passes, without duplicates. */
function symbolsFor(extra: MarketSymbol[]): MarketSymbol[] {
  const seen = new Set<string>();
  return [...MARKET_SYMBOLS, ...extra].filter(({ symbol }) => {
    const key = symbol.trim().toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface SnapshotOptions {
  /**
   * Tickers of companies on the exposure chart. The live layer does not read
   * the register itself — layers stay independent — so the page passes them.
   */
  extraSymbols?: MarketSymbol[];
}

export async function readLiveSnapshot(options: SnapshotOptions = {}): Promise<LiveSnapshot> {
  const demo = getLiveSourceName() === 'fixtures';
  const symbols = symbolsFor(options.extraSymbols ?? []);

  const [ais, gdelt, usgs, gdacs, nhc, eonet, weather, fred, quotes] = await Promise.all([
    settle('ais', async () =>
      demo ? parseAis(fixtures.fixtureAis()) : withKey('ais', async (key) => parseAis(await fetchAis(key))),
    ),
    settle('gdelt', async () => parseGdelt(demo ? fixtures.fixtureGdelt() : await fetchGdelt())),
    settle('usgs', async () => parseUsgs(demo ? fixtures.fixtureUsgs() : await fetchUsgs())),
    settle('gdacs', async () => parseGdacs(demo ? fixtures.fixtureGdacs() : await fetchGdacs())),
    settle('nhc', async () => parseNhc(demo ? fixtures.fixtureNhc() : await fetchNhc())),
    settle('eonet', async () => parseEonet(demo ? fixtures.fixtureEonet() : await fetchEonet())),
    settle('weather', async () => parseWeather(demo ? fixtures.fixtureWeather() : await fetchWeather())),
    settle('fred', async () => parseFred(demo ? fixtures.fixtureFred() : await fetchFred())),
    settle('quotes', async () =>
      demo
        ? parseQuotes(fixtures.fixtureQuotes(symbols))
        : withKey('quotes', async (key) => parseQuotes(await fetchQuotes(key, symbols))),
    ),
  ]);

  return {
    // When this snapshot was assembled — i.e. when the page was regenerated.
    // Displayed as such, and never used as any reading's age.
    generatedAt: new Date().toISOString(),
    ais,
    gdelt,
    usgs,
    gdacs,
    nhc,
    eonet,
    weather,
    fred,
    quotes,
  };
}
