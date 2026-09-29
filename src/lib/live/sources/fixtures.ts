/**
 * Sample payloads for every live source, for `npm run dev:demo`.
 *
 * Fenced exactly like the other two fixture sources (CLAUDE.md Rule 1):
 * reachable only with CONTENT_SOURCE=fixtures, every human-readable string
 * prefixed [SAMPLE], every link on example.invalid, and a production build that
 * touches this file throws at module load.
 *
 * Two deliberate choices:
 *
 * - **These are raw upstream-shaped payloads, not finished Readings.** They go
 *   through the same parse functions as live data, so the demo exercises the
 *   real parsers — including their handling of partial failure — rather than
 *   bypassing them. A fixture that skipped the parser would prove nothing.
 *
 * - **Timestamps are relative to now**, and chosen so the demo shows every
 *   freshness state at once: most sources live, GDACS delayed, EONET stale,
 *   three GDELT files missing. Fixed dates would make every panel read
 *   "stale" a week after this was written, and the states are what a reviewer
 *   most needs to see.
 *
 * Vessel MMSIs start 999, which is not an allocated maritime identification
 * digit range, so no sample vessel can collide with a real ship.
 */

import type { MarketSymbol } from '@/config/markets';

import { CHOKEPOINTS, PORTS } from '../nodes';
import type { AisSummary } from './ais';
import { createAisAccumulator } from './ais';
import type { GdeltRaw } from './gdelt';
import { EXPORT_COLUMNS, slotTimes, tallyExport } from './gdelt';
import type { FredRaw } from './fred';
import { FRED_SERIES } from './fred';
import type { FetchedJson } from './http';
import type { QuotesRaw } from './quotes';

if (process.env.NODE_ENV === 'production' && process.env.CONTENT_SOURCE === 'fixtures') {
  throw new Error(
    'CONTENT_SOURCE=fixtures must never be used for a production build. ' +
      'Live fixtures are sample data and would publish as real readings. ' +
      'Set CONTENT_SOURCE=local (or leave it unset).',
  );
}

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE);
const iso = (minutes: number) => ago(minutes).toISOString();

/** A small deterministic generator, so the demo is the same on every load. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

// ---------------------------------------------------------------------------

export function fixtureAis(): AisSummary {
  const random = seeded(7);
  const accumulator = createAisAccumulator();
  // Busy straits get many vessels, the Cape very few — as coverage would give.
  const counts: Record<string, number> = {
    'singapore-strait': 64,
    dover: 41,
    gibraltar: 28,
    hormuz: 19,
    'taiwan-strait': 17,
    bosphorus: 15,
    suez: 12,
    panama: 9,
    'bab-el-mandeb': 3,
    'cape-of-good-hope': 0,
  };
  let mmsi = 999_000_001;
  for (const node of CHOKEPOINTS) {
    if (!node.box) continue;
    const [[south, west], [north, east]] = node.box;
    for (let i = 0; i < (counts[node.id] ?? 0); i += 1) {
      const underway = random() > 0.3;
      accumulator.add({
        MessageType: 'PositionReport',
        Message: { PositionReport: { Sog: underway ? 6 + random() * 12 : random() * 0.4 } },
        MetaData: {
          MMSI: mmsi,
          ShipName: '[SAMPLE] VESSEL',
          latitude: south + random() * (north - south),
          longitude: west + random() * (east - west),
          time_utc: `${iso(1 + random() * 2).replace('T', ' ').slice(0, 19)}.000000 +0000 UTC`,
        },
      });
      mmsi += 1;
    }
  }
  return accumulator.summary(iso(1), 30);
}

/**
 * GDELT: synthetic 61-column event files, tallied by the real parser.
 *
 * Built so every output the change detection can produce appears: a hotspot
 * with a first appearance (no baseline), a surging place and an elevated one,
 * a country surge coded at country level, rising problem types, steady
 * background that must NOT be flagged, and three missing files.
 */
export function fixtureGdelt(): GdeltRaw {
  const latest = ago(8);
  latest.setUTCMinutes(Math.floor(latest.getUTCMinutes() / 15) * 15, 0, 0);
  const { recent, baseline } = slotTimes(latest.getTime());

  interface Row {
    base: string;
    quad: '1' | '3' | '4';
    reports: number;
    geoType: '1' | '4';
    name: string;
    cc: string;
    lat: number;
    lon: number;
    id: string;
    url: string;
  }

  const line = (r: Row): string => {
    const f = new Array<string>(EXPORT_COLUMNS).fill('');
    f[0] = String(Math.floor(Math.random() * 1e9));
    f[26] = r.base + '0';
    f[27] = r.base;
    f[28] = r.base.slice(0, 2);
    f[29] = r.quad;
    f[33] = String(r.reports);
    f[51] = r.geoType;
    f[52] = r.name;
    f[53] = r.cc;
    f[56] = String(r.lat);
    f[57] = String(r.lon);
    f[58] = r.id;
    f[60] = r.url;
    return f.join('\t');
  };

  const place = (name: string, cc: string, lat: number, lon: number, id: string) =>
    ({ name: `[SAMPLE] ${name}`, cc, lat, lon, id, geoType: '4' as const });

  const aden = place('Port city on the Gulf of Aden', 'YM', 12.79, 45.03, 'S-ADEN');
  const rotterdam = place('North Sea port city', 'NL', 51.92, 4.48, 'S-RTM');
  const kaohsiung = place('Southern Taiwan port city', 'TW', 22.62, 120.3, 'S-KHH');
  const bandar = place('Gulf port city', 'IR', 27.18, 56.27, 'S-BND');
  const santos = place('South Atlantic port city', 'BR', -23.96, -46.33, 'S-SSZ');
  const capital = place('Inland capital', 'US', 38.9, -77.03, 'S-CAP');

  const file = (isRecent: boolean, slot: number): string => {
    const rows: Row[] = [];
    const url = (tag: string, n: number) => `https://example.invalid/sample/${tag}-${slot}-${n}`;
    // The denominator: steady non-conflict reporting everywhere.
    rows.push({ ...capital, base: '042', quad: '1', reports: 380, url: url('capital', 1) });
    // Steady conflict background — present in both windows, must not flag.
    rows.push({ ...bandar, base: '112', quad: '3', reports: 6, url: url('gulf', 1) });
    rows.push({ ...santos, base: '141', quad: '3', reports: 3, url: url('santos', 1) });

    if (isRecent) {
      // Surging and new: fighting and a blockade near the strait.
      rows.push({ ...aden, base: '190', quad: '4', reports: 6, url: `https://example.invalid/sample/aden-report-${slot % 4}` });
      rows.push({ ...aden, base: '191', quad: '4', reports: 3, url: `https://example.invalid/sample/aden-blockade-${slot % 3}` });
      // A port strike.
      rows.push({ ...rotterdam, base: '143', quad: '3', reports: 5, url: `https://example.invalid/sample/port-strike-${slot % 3}` });
      // Elevated, not surging.
      rows.push({ ...kaohsiung, base: '130', quad: '3', reports: slot % 2 === 0 ? 3 : 2, url: url('taiwan', 1) });
      // Sanctions coded at country level — a country surge with no city.
      rows.push({ ...place('China', 'CH', 35, 105, 'CH'), geoType: '1', base: '163', quad: '3', reports: 7, url: url('sanctions', 1) });
    } else {
      rows.push({ ...rotterdam, base: '143', quad: '3', reports: slot % 3 === 0 ? 1 : 0, url: url('rotterdam', 1) });
      rows.push({ ...kaohsiung, base: '130', quad: '3', reports: 1, url: url('taiwan', 1) });
      rows.push({ ...place('China', 'CH', 35, 105, 'CH'), geoType: '1', base: '163', quad: '3', reports: 2, url: url('sanctions', 1) });
    }
    return rows.filter((r) => r.reports > 0).map(line).join('\n') + '\n';
  };

  return {
    latest: latest.toISOString(),
    // Three files missing, to show the comparison running on what it has.
    recent: recent.map((_, i) => (i === 5 ? null : tallyExport(file(true, i)))),
    baseline: baseline.map((_, i) => (i === 3 || i === 17 ? null : tallyExport(file(false, i)))),
  };
}

export function fixtureUsgs(): FetchedJson {
  const quake = (id: string, mag: number, lat: number, lon: number, minutes: number, place: string) => ({
    type: 'Feature',
    id,
    properties: {
      mag,
      place: `[SAMPLE] ${place}`,
      time: ago(minutes).getTime(),
      url: `https://example.invalid/quake/${id}`,
      tsunami: 0,
      alert: mag >= 6 ? 'yellow' : null,
    },
    geometry: { type: 'Point', coordinates: [lon, lat, 18] },
  });
  return {
    body: {
      type: 'FeatureCollection',
      metadata: { generated: ago(4).getTime(), count: 4 },
      features: [
        quake('sample-q1', 6.1, 23.9, 121.6, 140, 'Offshore, east of a major island'),
        quake('sample-q2', 5.2, 36.4, 140.9, 320, 'Near a coastal prefecture'),
        quake('sample-q3', 4.8, -6.1, 130.4, 610, 'Remote sea region'),
        quake('sample-q4', 4.6, 38.1, 27.1, 900, 'Inland, near an industrial coast'),
      ],
    },
    served: iso(4),
  };
}

export function fixtureGdacs(): FetchedJson {
  // Updated eight hours ago, so the demo shows a DELAYED source.
  return {
    body: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [122.4, 27.8] },
          properties: {
            eventtype: 'TC',
            eventid: 9_000_001,
            name: '[SAMPLE] Tropical cyclone approaching an east Asian coast',
            alertlevel: 'Red',
            country: '[SAMPLE]',
            fromdate: iso(3 * 24 * 60),
            todate: iso(8 * 60),
            datemodified: iso(8 * 60),
            url: { report: 'https://example.invalid/gdacs/tc-9000001' },
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [90.4, 23.7] },
          properties: {
            eventtype: 'FL',
            eventid: 9_000_002,
            name: '[SAMPLE] Monsoon flooding in a river delta',
            alertlevel: 'Orange',
            country: '[SAMPLE]',
            fromdate: iso(6 * 24 * 60),
            todate: iso(10 * 60),
            datemodified: iso(10 * 60),
            url: { report: 'https://example.invalid/gdacs/fl-9000002' },
          },
        },
      ],
    },
    served: iso(8 * 60),
  };
}

export function fixtureNhc(): FetchedJson {
  // Empty on purpose: the most common real state, and the one that most needs
  // to read correctly ("none active", not "unavailable").
  return { body: { activeStorms: [] }, served: iso(6) };
}

export function fixtureEonet(): FetchedJson {
  // Latest update eight days ago, so the demo shows a STALE source.
  const event = (id: string, title: string, category: string, lat: number, lon: number, minutes: number) => ({
    id,
    title: `[SAMPLE] ${title}`,
    link: `https://example.invalid/eonet/${id}`,
    categories: [{ id: category.toLowerCase(), title: category }],
    sources: [{ id: 'SAMPLE', url: `https://example.invalid/eonet/${id}/source` }],
    geometry: [{ date: iso(minutes), type: 'Point', coordinates: [lon, lat] }],
  });
  return {
    body: {
      events: [
        event('sample-e1', 'Wildfire near a port hinterland', 'Wildfires', 33.9, -117.9, 8 * 24 * 60),
        event('sample-e2', 'Volcanic ash advisory', 'Volcanoes', 31.6, 130.7, 9 * 24 * 60),
        event('sample-e3', 'Wildfire far from any trade node', 'Wildfires', 64.1, -150.2, 10 * 24 * 60),
      ],
    },
    served: iso(8 * 24 * 60),
  };
}

export function fixtureWeather(): FetchedJson {
  const random = seeded(3);
  const time = new Date(Date.now() - 12 * MINUTE);
  time.setUTCMinutes(Math.floor(time.getUTCMinutes() / 15) * 15, 0, 0);
  const stamp = time.toISOString().slice(0, 16);
  return {
    body: PORTS.map((port) => {
      // One port in a gale, so the ranking has something to rank.
      const wind = port.id === 'ningbo' ? 18.4 : 2 + random() * 9;
      return {
        latitude: port.lat,
        longitude: port.lon,
        current: {
          time: stamp,
          interval: 900,
          wind_speed_10m: Math.round(wind * 10) / 10,
          wind_gusts_10m: Math.round(wind * 1.45 * 10) / 10,
        },
      };
    }),
    served: iso(12),
  };
}

/**
 * FRED: CSV in FRED's own format, through the real parser. Brent jumps on
 * the last day so the oil-move flag has something to fire on; one series
 * fails, to show a partial result.
 */
export function fixtureFred(): FredRaw {
  const random = seeded(19);
  const start: Record<string, number> = {
    DCOILBRENTEU: 76,
    DCOILWTICO: 72,
    DHHNGSP: 2.8,
    GASDESW: 3.7,
    DTWEXBGS: 121,
  };
  const series = FRED_SERIES.map((spec) => {
    if (spec.id === 'DHHNGSP') {
      return { id: spec.id, text: null, error: 'FRED did not answer in time.' };
    }
    const lines = [`observation_date,${spec.id}`];
    let value = start[spec.id];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let daysAgo = 180; daysAgo >= 1; daysAgo -= 1) {
      const date = new Date(today.getTime() - daysAgo * 24 * 60 * MINUTE);
      const weekday = date.getUTCDay();
      if (spec.cadence === 'weekly' ? weekday !== 1 : weekday === 0 || weekday === 6) continue;
      value *= 1 + (random() - 0.5) * (spec.unit === 'index' ? 0.006 : 0.03);
      if (spec.id === 'DCOILBRENTEU' && daysAgo <= 3) value *= 1.021;
      // FRED writes "." for a holiday; the parser must skip it, not fill it.
      const written = daysAgo === 40 ? '.' : value.toFixed(spec.unit === 'usd-bbl' ? 2 : 3);
      lines.push(`${date.toISOString().slice(0, 10)},${written}`);
    }
    return { id: spec.id, text: lines.join('\n'), error: null };
  });
  return { series };
}

/** Finnhub-shaped quote bodies, plus one symbol the provider does not know. */
export function fixtureQuotes(symbols: MarketSymbol[]): QuotesRaw {
  const random = seeded(23);
  const time = Math.floor((Date.now() - 16 * MINUTE) / 1000);
  return {
    results: [...symbols, { symbol: 'NOPE', label: '[SAMPLE] An unrecognised symbol' }].map(({ symbol, label }) => {
      if (symbol === 'NOPE') {
        return { symbol, label, fetched: { body: { c: 0, d: null, dp: null, pc: 0, t: 0 }, served: iso(16) }, error: null };
      }
      const pc = 20 + random() * 400;
      const c = pc * (1 + (random() - 0.5) * 0.04);
      return {
        symbol,
        label,
        fetched: { body: { c: Math.round(c * 100) / 100, pc: Math.round(pc * 100) / 100, t: time }, served: iso(16) },
        error: null,
      };
    }),
  };
}
