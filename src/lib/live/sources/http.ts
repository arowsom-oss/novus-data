/**
 * The one way this layer talks to the network over HTTP.
 *
 * Server only — it is imported solely from ./index.ts, which the lint boundary
 * keeps pages and components away from.
 *
 * Every request is cached through Next's data cache for fifteen minutes and
 * tagged, so the page and /live.json share one upstream call per window rather
 * than doubling it. When a cached entry expires, the stale value is served
 * while a fresh one is fetched in the background; if that background fetch
 * fails, the last good value keeps being served (Next 16, "Incremental Static
 * Regeneration"). That is exactly why a reading's age must come from inside
 * the payload — see ../types.ts.
 */

import { LIVE_REVALIDATE_SECONDS } from '../types';
import type { LiveSourceId } from '../types';

/**
 * An error whose message is safe to put on the page.
 *
 * Upstream error bodies are never shown: they can be long, they can be HTML,
 * and nothing guarantees they contain nothing sensitive. Every reason a
 * reader sees is a sentence this layer wrote.
 */
export class LiveSourceError extends Error {
  constructor(public readonly publicReason: string) {
    super(publicReason);
    this.name = 'LiveSourceError';
  }
}

const USER_AGENT = 'NovusData/1.0 (supply chain disruption monitor)';

/**
 * A parsed body, plus the upstream's own `Date` header.
 *
 * `served` is a LAST-RESORT timestamp, for a feed that is legitimately empty —
 * no active hurricanes, no red alerts — and so carries no time of its own.
 * Parsers prefer any timestamp inside the payload and say which one they used.
 */
export interface FetchedJson {
  body: unknown;
  served: string | null;
}

interface RequestOptions {
  timeoutMs?: number;
  label?: string;
  /**
   * Seconds the data cache keeps a 200. Defaults to the page's fifteen-minute
   * cycle. A file that never changes once published (a GDELT export is named
   * for its fifteen-minute slot and never rewritten) can be cached far longer,
   * which is what keeps a seven-day baseline cheap: each file is downloaded
   * once, then read from the cache on every later regeneration. Only 200s are
   * stored, so a file that 404s is asked for again next time rather than
   * remembered as missing.
   */
  revalidateSeconds?: number;
  /**
   * Extra request headers — used to carry an API key in a header rather than
   * in the URL, so the key never appears in anything that logs URLs.
   */
  headers?: Record<string, string>;
}

/** The one GET every adapter goes through: cached, tagged, timed out, and failing in words this layer wrote. */
async function fetchRaw(url: string, source: LiveSourceId, options: RequestOptions): Promise<Response> {
  const label = options.label ?? source;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, ...options.headers },
      signal: AbortSignal.timeout(options.timeoutMs ?? 12_000),
      next: {
        revalidate: options.revalidateSeconds ?? LIVE_REVALIDATE_SECONDS,
        tags: ['live', `live:${source}`],
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new LiveSourceError(
      timedOut ? `${label} did not answer in time.` : `${label} could not be reached.`,
    );
  }
  if (response.status === 429) {
    throw new LiveSourceError(`${label} is rate-limiting requests; it will be retried next cycle.`);
  }
  if (!response.ok) throw new LiveSourceError(`${label} answered with HTTP ${response.status}.`);
  return response;
}

export async function fetchJson(
  url: string,
  source: LiveSourceId,
  options: Omit<RequestOptions, 'revalidateSeconds'> = {},
): Promise<FetchedJson> {
  const response = await fetchRaw(url, source, {
    ...options,
    headers: { accept: 'application/json', ...options.headers },
  });
  const served = isoFrom(response.headers.get('date'));
  const text = await response.text();
  if (text.trim() === '') return { body: {}, served };

  try {
    return { body: JSON.parse(text) as unknown, served };
  } catch {
    // A 200 with a body that is not JSON — an HTML error page, a line of
    // plain text. Treat it as a failure, and do not echo it.
    throw new LiveSourceError(`${options.label ?? source} returned something other than JSON.`);
  }
}

/** A raw GET for bodies that are not JSON: a text index, a CSV. */
export async function fetchText(url: string, source: LiveSourceId, options: RequestOptions = {}): Promise<string> {
  const response = await fetchRaw(url, source, options);
  return response.text();
}

/** A raw GET for binary bodies — a zip archive. */
export async function fetchBytes(url: string, source: LiveSourceId, options: RequestOptions = {}): Promise<Buffer> {
  const response = await fetchRaw(url, source, options);
  return Buffer.from(await response.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Narrowing helpers. Every upstream field is `unknown` until one of these has
// looked at it: a feed that changes shape must degrade to fewer items, never
// to a wrong number.
// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** A finite number from a number or a numeric string, else null. Never NaN, never a default. */
export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** An ISO string from something `Date` can read, else null. */
export function isoFrom(value: unknown): string | null {
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = str(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The latest of a set of ISO strings, or null. */
export function latestIso(values: Array<string | null>): string | null {
  let best: string | null = null;
  let bestTime = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isFinite(time) && time > bestTime) {
      bestTime = time;
      best = value;
    }
  }
  return best;
}

/**
 * Choose the timestamp a reading's age is measured from, and say which it is.
 *
 * An internal timestamp always wins. The upstream's `Date` header is used only
 * when the payload has none — typically a legitimately empty feed. If neither
 * exists the age cannot be stated, and a reading whose age cannot be stated is
 * not shown as current: the caller throws, and the page says "unavailable".
 */
export function resolveAsOf(
  internal: string | null,
  internalBasis: string,
  served: string | null,
  publisher: string,
): { asOf: string; asOfBasis: string; notes: string[] } {
  if (internal) return { asOf: internal, asOfBasis: internalBasis, notes: [] };
  if (served) {
    return {
      asOf: served,
      asOfBasis: `response served by ${publisher}`,
      notes: [
        'The feed was empty, so it carried no timestamp of its own; the time shown is when the publisher served it.',
      ],
    };
  }
  throw new LiveSourceError(`${publisher} carried no timestamp, so the age of its data cannot be stated.`);
}
