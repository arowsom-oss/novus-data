/**
 * Stock and fund prices — off unless a licensed quote key is configured.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE SETTING THE KEY
 *
 * Exchange prices are licensed data. Every free API tier checked when this
 * was built — Finnhub included — is for personal, non-commercial use, and
 * showing prices to the public on a website is redistribution. So this
 * adapter is built and tested but ships switched off: with no
 * FINNHUB_API_KEY the panel says "not switched on yet" and nothing is
 * requested. Setting the key on the public site is a licensing decision for
 * the author, recorded in DEPLOY.md Part 6, not a configuration step.
 *
 * The key travels in a request header (X-Finnhub-Token), never in the URL, so
 * it cannot appear in anything that logs URLs. It is read in ./index.ts and
 * never stored on a Reading.
 * ---------------------------------------------------------------------------
 *
 * Finnhub's /quote returns { c, pc, t, ... }: last price, previous close, and
 * the Unix time of the price. An unknown symbol comes back as all zeros —
 * treated as missing, never as a price of zero.
 */

import type { MarketSymbol } from '@/config/markets';

import type { Quote, QuotesData, Reading } from '../types';
import { LiveSourceError, fetchJson, isRecord, num, type FetchedJson } from './http';

const QUOTE_URL = 'https://finnhub.io/api/v1/quote';
/** Finnhub's free tier allows 60 calls a minute; stay well inside it. */
export const MAX_SYMBOLS = 25;

export interface QuotesRaw {
  results: Array<{ symbol: string; label: string; fetched: FetchedJson | null; error: string | null }>;
}

export async function fetchQuotes(apiKey: string, symbols: MarketSymbol[]): Promise<QuotesRaw> {
  const results = await Promise.all(
    symbols.slice(0, MAX_SYMBOLS).map(async ({ symbol, label }) => {
      try {
        const fetched = await fetchJson(`${QUOTE_URL}?symbol=${encodeURIComponent(symbol)}`, 'quotes', {
          label: 'Finnhub',
          timeoutMs: 8_000,
          headers: { 'X-Finnhub-Token': apiKey },
        });
        return { symbol, label, fetched, error: null };
      } catch (error) {
        return {
          symbol,
          label,
          fetched: null,
          // Our own sentence. A 401 means the key; it is never echoed.
          error: error instanceof LiveSourceError ? error.publicReason : 'Finnhub could not be read.',
        };
      }
    }),
  );
  return { results };
}

export function parseQuotes(raw: QuotesRaw): Reading<QuotesData> {
  const quotes: Quote[] = [];
  const missing: string[] = [];

  for (const { symbol, label, fetched } of raw.results) {
    const body = fetched?.body;
    const price = isRecord(body) ? num(body.c) : null;
    const time = isRecord(body) ? num(body.t) : null;
    if (price === null || price <= 0 || time === null || time <= 0) {
      missing.push(symbol);
      continue;
    }
    const previousClose = isRecord(body) ? num(body.pc) : null;
    quotes.push({
      symbol,
      label,
      price,
      previousClose: previousClose && previousClose > 0 ? previousClose : null,
      changePct: previousClose && previousClose > 0 ? (price / previousClose - 1) * 100 : null,
      at: new Date(time * 1000).toISOString(),
    });
  }

  if (quotes.length === 0) {
    const first = raw.results.find((r) => r.error)?.error;
    throw new LiveSourceError(first ?? 'Finnhub returned no prices for any symbol.');
  }

  const newest = quotes.map((q) => q.at).sort().at(-1)!;
  return {
    status: 'ok',
    source: 'quotes',
    asOf: newest,
    asOfBasis: 'latest trade time reported by Finnhub',
    data: { quotes, missing },
    notes: [
      'Outside trading hours these are the last prices of the previous session. Price moves have many causes; nothing here says a disruption moved a price.',
    ],
  };
}
