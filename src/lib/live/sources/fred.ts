/**
 * Energy prices and the dollar — public-domain series served by FRED.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE, AND WHY FROM HERE
 *
 * Every series here is produced by the U.S. government: the Energy
 * Information Administration (crude, gas, diesel) and the Federal Reserve
 * Board (the dollar). That is what makes them publishable: U.S. federal data
 * is in the public domain, whereas exchange prices for stocks and futures are
 * licensed and free API tiers forbid showing them publicly (see quotes.ts).
 *
 * FRED, run by the Federal Reserve Bank of St. Louis, republishes them as
 * plain CSV with no key. The number and its date are the EIA's or the
 * Board's; FRED is the delivery. The page credits both.
 *
 * These are DAILY settlement values published with a lag of about a
 * business day — not a live ticker. The page says "as of" the observation
 * date, which is the honest description, and §13's line against live market
 * data still holds: nothing here is presented as a current price.
 *
 * Diesel is weekly (EIA's Monday survey). It matters for a different reason
 * from crude: it is the fuel trucks and most ships' auxiliary engines burn,
 * so it is the energy price closest to the cost of moving goods.
 * ---------------------------------------------------------------------------
 */

import type { FredData, PricePoint, PriceSeries, PriceUnit, Reading } from '../types';
import { LiveSourceError, fetchText } from './http';

interface SeriesSpec {
  id: string;
  label: string;
  origin: string;
  unit: PriceUnit;
  cadence: 'daily' | 'weekly';
}

export const FRED_SERIES: SeriesSpec[] = [
  { id: 'DCOILBRENTEU', label: 'Brent crude oil', origin: 'U.S. Energy Information Administration', unit: 'usd-bbl', cadence: 'daily' },
  { id: 'DCOILWTICO', label: 'WTI crude oil (Cushing, Oklahoma)', origin: 'U.S. Energy Information Administration', unit: 'usd-bbl', cadence: 'daily' },
  { id: 'DHHNGSP', label: 'Natural gas (Henry Hub)', origin: 'U.S. Energy Information Administration', unit: 'usd-mmbtu', cadence: 'daily' },
  { id: 'GASDESW', label: 'US diesel, average retail price', origin: 'U.S. Energy Information Administration', unit: 'usd-gal', cadence: 'weekly' },
  { id: 'DTWEXBGS', label: 'US dollar against trading partners (broad index)', origin: 'Federal Reserve Board', unit: 'index', cadence: 'daily' },
];

const CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv';
const HISTORY_DAYS = 200;
const DAY_MS = 24 * 60 * 60_000;

export interface FredRaw {
  series: Array<{ id: string; text: string | null; error: string | null }>;
}

export async function fetchFred(): Promise<FredRaw> {
  const start = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString().slice(0, 10);
  const series = await Promise.all(
    FRED_SERIES.map(async (spec) => {
      try {
        const text = await fetchText(`${CSV_URL}?id=${spec.id}&cosd=${start}`, 'fred', {
          label: 'FRED',
          timeoutMs: 10_000,
        });
        return { id: spec.id, text, error: null };
      } catch (error) {
        return {
          id: spec.id,
          text: null,
          error: error instanceof LiveSourceError ? error.publicReason : 'FRED could not be read.',
        };
      }
    }),
  );
  return { series };
}

/**
 * `observation_date,DCOILWTICO` then one `YYYY-MM-DD,value` per line. FRED
 * writes "." for a day with no observation (a holiday); those are skipped,
 * never filled.
 */
export function parseFredCsv(text: string, id: string): PricePoint[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split(',') ?? [];
  if (header.length < 2 || header[1].trim() !== id) return [];

  const points: PricePoint[] = [];
  for (const line of lines.slice(1)) {
    const [date, raw] = line.split(',');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) continue;
    const value = Number(raw);
    if (raw === '.' || raw === undefined || !Number.isFinite(value)) continue;
    points.push({ date, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Per cent change from the last observation on or before `days` before the latest. */
function changeOver(points: PricePoint[], days: number): number | null {
  const latest = points.at(-1);
  if (!latest) return null;
  const cutoff = Date.parse(`${latest.date}T00:00:00Z`) - days * DAY_MS;
  for (let i = points.length - 2; i >= 0; i -= 1) {
    if (Date.parse(`${points[i].date}T00:00:00Z`) <= cutoff) {
      return points[i].value === 0 ? null : (latest.value / points[i].value - 1) * 100;
    }
  }
  return null;
}

export function parseFred(raw: FredRaw): Reading<FredData> {
  const notes: string[] = [];
  const series: PriceSeries[] = [];

  for (const spec of FRED_SERIES) {
    const entry = raw.series.find((s) => s.id === spec.id);
    const points = entry?.text ? parseFredCsv(entry.text, spec.id) : [];
    const latest = points.at(-1);
    if (!latest) {
      notes.push(`${spec.label}: ${entry?.error ?? 'no observations in the response'}`);
      continue;
    }
    series.push({
      ...spec,
      points,
      latest,
      changeWeek: changeOver(points, 7),
      changeMonth: changeOver(points, 30),
      sourceUrl: `https://fred.stlouisfed.org/series/${spec.id}`,
    });
  }

  if (series.length === 0) {
    throw new LiveSourceError(raw.series.find((s) => s.error)?.error ?? 'FRED returned no usable series.');
  }

  // The newest daily observation dates the reading. Weekly diesel carries its
  // own date on its own row.
  const daily = series.filter((s) => s.cadence === 'daily');
  const newest = (daily.length > 0 ? daily : series)
    .map((s) => s.latest.date)
    .sort()
    .at(-1)!;

  notes.push(
    'Daily values are settlement prices published about a business day later; weekly diesel is the EIA Monday survey. None of these is a live quote.',
  );

  return {
    status: 'ok',
    source: 'fred',
    asOf: `${newest}T00:00:00.000Z`,
    asOfBasis: 'latest observation date',
    data: { series },
    notes,
  };
}
