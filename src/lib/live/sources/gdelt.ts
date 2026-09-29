/**
 * GDELT Event Database 2.0 — where conflict reporting is rising against its
 * own normal.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MEASURES
 *
 * Every fifteen minutes GDELT publishes a file of events its software coded
 * from the world's news: who did what to whom, where, and how many articles
 * reported it. This adapter keeps the conflict-type events (CAMEO QuadClass
 * 3 and 4: threats, protests, strikes, blockades, sanctions, seizures,
 * assaults, fighting) and asks one question of them:
 *
 *   Is a place, a country or a kind of problem getting a larger share of the
 *   world's reporting than it normally does?
 *
 * "Normally" is the same three-hour window of the day on each of the previous
 * seven days. The time-of-day match matters: the mix of the world's news
 * shifts with the sun, so a baseline averaged over the whole day would flag
 * Asian ports every night simply because Asia is awake.
 *
 * Shares, not raw counts, because total news output swings through the day
 * and the week. A share cancels that out.
 *
 * It measures REPORTING, not events. A surge means more is being written
 * about a place — which is worth knowing early — not that more is happening
 * there, and GDELT's coding and geocoding are automated and imperfect. The
 * page says so, and nothing here ever feeds the register.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RAW FILES AND NOT GDELT'S QUERY API
 *
 * The first version used the DOC 2.0 API. From GitHub's runners (shared cloud
 * IPs, like Vercel's) it refused every request — HTTP 429, then timeouts — in
 * both real runs (CLAUDE.md §6d). The raw exports are static files on
 * data.gdeltproject.org with no request limit, and each file is immutable
 * once published, so the fetch cache holds the seven-day baseline and a
 * regeneration usually downloads only the newest file or two.
 *
 * Citation is a condition of use (see ../meta.ts) — the page carries it.
 * ---------------------------------------------------------------------------
 */

import { countryName } from '../countries';
import { ALL_NODES, distanceKm, excludedFromReporting, nearestNode, reportingRadiusKm } from '../nodes';
import {
  REPORTING_RULES,
  type CountrySurge,
  type GdeltData,
  type Hotspot,
  type PlaceReporting,
  type ProblemTrend,
  type Reading,
  type ReportingLevel,
  type SourceLink,
  type TradeNode,
} from '../types';
import { LiveSourceError, fetchBytes, fetchText } from './http';
import { unzipFirstEntry } from './unzip';

const LAST_UPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';
const FILE_BASE_URL = 'http://data.gdeltproject.org/gdeltv2/';

const SLOT_MS = 15 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** Twelve fifteen-minute files: the last three hours. */
const RECENT_SLOTS = 12;
const BASELINE_DAYS = 7;
/** Four files from the same three-hour window on each baseline day, 45 minutes apart. */
const BASELINE_SLOTS_PER_DAY = 4;
const BASELINE_STEP_MS = 45 * 60_000;

/** Below these, the comparison is not made at all and the panel says why. */
const MIN_RECENT_FILES = 8;
const MIN_BASELINE_FILES = 14;

/** Wall-clock budget for the whole read, so a slow host can never push a regeneration past maxDuration. */
const BUDGET_MS = 30_000;
const FILE_TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;
/** An export is never rewritten once published, so it can be cached for longer than the baseline spans. */
const IMMUTABLE_SECONDS = 9 * 24 * 60 * 60;

const MAX_HOTSPOTS = 12;
const MAX_NO_BASELINE = 6;
const MAX_COUNTRIES = 10;
const SOURCES_PER_HOTSPOT = 3;

// ---------------------------------------------------------------------------
// The file layout. GDELT 2.0 event exports are tab-separated with 61 columns
// and no header (GDELT Event Codebook V2.0). Only these are read.
// ---------------------------------------------------------------------------

export const EXPORT_COLUMNS = 61;
const COL = {
  eventBaseCode: 27,
  eventRootCode: 28,
  quadClass: 29,
  numArticles: 33,
  geoType: 51,
  geoFullName: 52,
  geoCountry: 53,
  geoLat: 56,
  geoLon: 57,
  geoFeatureId: 58,
  sourceUrl: 60,
} as const;

/** ActionGeo_Type 3 (US city) and 4 (world city). Country and state centroids are not places. */
const CITY_GEO_TYPES = new Set(['3', '4']);

/**
 * The kinds of problem tracked, by CAMEO code. Chosen for what moves goods:
 * a strike, a blockade or a sanction is a supply chain event in a way most
 * diplomatic friction is not. Codes are CAMEO's, not ours.
 */
const PROBLEM_TYPES: Array<{ id: string; label: string; bases?: string[]; roots?: string[] }> = [
  { id: 'strikes', label: 'Strikes and boycotts', bases: ['143'] },
  { id: 'blockades', label: 'Blockades and obstruction', bases: ['144', '191'] },
  { id: 'sanctions', label: 'Sanctions and embargoes', bases: ['163'] },
  { id: 'seizures', label: 'Seizures of property', bases: ['171'] },
  { id: 'restrictions', label: 'Administrative restrictions', bases: ['172'] },
  { id: 'protests', label: 'Protests of all kinds', roots: ['14'] },
  { id: 'threats', label: 'Threats', roots: ['13'] },
  { id: 'posture', label: 'Military posturing', roots: ['15'] },
  { id: 'assaults', label: 'Assaults and bombings', roots: ['18'] },
  { id: 'fighting', label: 'Armed fighting', roots: ['19', '20'] },
];

// ---------------------------------------------------------------------------
// One file → tallies. Pure, exported, and what the fixtures run through.
// ---------------------------------------------------------------------------

export interface LocationTally {
  name: string;
  countryCode: string | null;
  lat: number;
  lon: number;
  reports: number;
  /** Event rows behind `reports`. */
  events: number;
  /** The best-reported articles behind this location, most-reported first. */
  sources: Array<{ url: string; reports: number }>;
}

export interface FileTally {
  rows: number;
  malformed: number;
  totalReports: number;
  conflictReports: number;
  locations: Record<string, LocationTally>;
  countries: Record<string, number>;
  problems: Record<string, number>;
  places: Record<string, number>;
  /** Event rows behind each place's reports. */
  placeEvents: Record<string, number>;
}

function emptyTally(): FileTally {
  return {
    rows: 0,
    malformed: 0,
    totalReports: 0,
    conflictReports: 0,
    locations: {},
    countries: {},
    problems: {},
    places: {},
    placeEvents: {},
  };
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

/**
 * The tracked places a story geocoded here counts for: the nearest port or
 * cluster within its reporting radius, and the nearest chokepoint within
 * its radius — at most one of each. Rotterdam and Antwerp are 77 km apart,
 * Shanghai and Ningbo 80, so counting every place in reach made one
 * Rotterdam story raise Antwerp too, and two "surging" alerts read as two
 * confirmations of one thing (the first real run showed both surging
 * together). A port and the chokepoint it sits on may both count —
 * Singapore and its strait are 12 km apart — because that overlap is
 * geography, not duplication.
 *
 * The nearest place decides, and its exclusions are final: The Hague is
 * excluded from Rotterdam, and must not then fall through to Antwerp, 89 km
 * away, simply because Antwerp's radius reaches it.
 */
function placesCounting(lat: number, lon: number, geocodedName: string): string[] {
  type Hit = { node: TradeNode; km: number } | null;
  let port: Hit = null;
  let chokepoint: Hit = null;
  for (const node of ALL_NODES) {
    const radius = reportingRadiusKm(node);
    // A degree of latitude is 111.2 km, so a node further than the radius in
    // latitude alone is out of reach; this skips the haversine for most
    // nodes on every row, which is most of this function's cost.
    if (Math.abs(lat - node.lat) * 111 > radius) continue;
    const km = distanceKm(lat, lon, node.lat, node.lon);
    if (km > radius) continue;
    if (node.kind === 'chokepoint') {
      if (!chokepoint || km < chokepoint.km) chokepoint = { node, km };
    } else if (!port || km < port.km) {
      port = { node, km };
    }
  }
  return [port, chokepoint]
    .filter((hit): hit is NonNullable<typeof hit> => hit !== null && !excludedFromReporting(hit.node, geocodedName))
    .map((hit) => hit.node.id);
}

export function tallyExport(text: string): FileTally {
  const tally = emptyTally();

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    tally.rows += 1;

    const f = line.split('\t');
    if (f.length !== EXPORT_COLUMNS) {
      tally.malformed += 1;
      continue;
    }
    const quad = f[COL.quadClass];
    const reports = Number(f[COL.numArticles]);
    if (!/^[1-4]$/.test(quad) || !Number.isInteger(reports) || reports < 0) {
      tally.malformed += 1;
      continue;
    }

    tally.totalReports += reports;
    if (quad !== '3' && quad !== '4') continue;
    tally.conflictReports += reports;

    const root = f[COL.eventRootCode];
    const base = f[COL.eventBaseCode];
    for (const type of PROBLEM_TYPES) {
      if (type.bases?.includes(base) || type.roots?.includes(root)) {
        tally.problems[type.id] = (tally.problems[type.id] ?? 0) + reports;
      }
    }

    const country = f[COL.geoCountry].trim();
    if (country) tally.countries[country] = (tally.countries[country] ?? 0) + reports;

    if (!CITY_GEO_TYPES.has(f[COL.geoType])) continue;
    const lat = Number(f[COL.geoLat]);
    const lon = Number(f[COL.geoLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const key = f[COL.geoFeatureId].trim() || `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const location = (tally.locations[key] ??= {
      name: f[COL.geoFullName].trim() || 'Unnamed place',
      countryCode: country || null,
      lat,
      lon,
      reports: 0,
      events: 0,
      sources: [],
    });
    location.reports += reports;
    location.events += 1;

    const url = f[COL.sourceUrl].trim();
    if (isHttpUrl(url)) {
      const existing = location.sources.find((s) => s.url === url);
      if (existing) existing.reports += reports;
      else location.sources.push({ url, reports });
      location.sources.sort((a, b) => b.reports - a.reports);
      location.sources.length = Math.min(location.sources.length, SOURCES_PER_HOTSPOT * 2);
    }

    for (const nodeId of placesCounting(lat, lon, f[COL.geoFullName].trim())) {
      tally.places[nodeId] = (tally.places[nodeId] ?? 0) + reports;
      tally.placeEvents[nodeId] = (tally.placeEvents[nodeId] ?? 0) + 1;
    }
  }

  return tally;
}

function add(into: Record<string, number>, from: Record<string, number>): void {
  for (const [key, value] of Object.entries(from)) into[key] = (into[key] ?? 0) + value;
}

function merge(tallies: FileTally[]): FileTally {
  const total = emptyTally();
  for (const t of tallies) {
    total.rows += t.rows;
    total.malformed += t.malformed;
    total.totalReports += t.totalReports;
    total.conflictReports += t.conflictReports;
    add(total.countries, t.countries);
    add(total.problems, t.problems);
    add(total.places, t.places);
    add(total.placeEvents, t.placeEvents);
    for (const [key, loc] of Object.entries(t.locations)) {
      const into = (total.locations[key] ??= { ...loc, reports: 0, events: 0, sources: [] });
      into.reports += loc.reports;
      into.events += loc.events;
      for (const source of loc.sources) {
        const existing = into.sources.find((s) => s.url === source.url);
        if (existing) existing.reports += source.reports;
        else into.sources.push({ ...source });
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

export interface GdeltRaw {
  /** The newest file's own fifteen-minute stamp, as ISO. */
  latest: string;
  recent: Array<FileTally | null>;
  baseline: Array<FileTally | null>;
}

function stampOf(time: number): string {
  return new Date(time).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function timeOfStamp(stamp: string): number | null {
  const m = stamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const time = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return Number.isFinite(time) ? time : null;
}

/** Recent slots, newest first, then the same window on each baseline day. */
export function slotTimes(latest: number): { recent: number[]; baseline: number[] } {
  const recent = Array.from({ length: RECENT_SLOTS }, (_, k) => latest - k * SLOT_MS);
  const baseline: number[] = [];
  for (let day = 1; day <= BASELINE_DAYS; day += 1) {
    for (let step = 0; step < BASELINE_SLOTS_PER_DAY; step += 1) {
      baseline.push(latest - day * DAY_MS - step * BASELINE_STEP_MS);
    }
  }
  return { recent, baseline };
}

async function pool<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchGdelt(): Promise<GdeltRaw> {
  const deadline = Date.now() + BUDGET_MS;

  // The index is the one thing that must be fresh: it names the newest file.
  const index = await fetchText(LAST_UPDATE_URL, 'gdelt', { label: 'GDELT', timeoutMs: 8_000 });
  const stamp = index.match(/(\d{14})\.export\.CSV\.zip/i)?.[1];
  const latest = stamp ? timeOfStamp(stamp) : null;
  if (latest === null) throw new LiveSourceError("GDELT's update index did not name an event file.");

  const { recent, baseline } = slotTimes(latest);

  const read = async (time: number): Promise<FileTally | null> => {
    const remaining = deadline - Date.now();
    if (remaining < 1_500) return null;
    try {
      const zipped = await fetchBytes(`${FILE_BASE_URL}${stampOf(time)}.export.CSV.zip`, 'gdelt', {
        label: 'GDELT',
        timeoutMs: Math.min(FILE_TIMEOUT_MS, remaining),
        revalidateSeconds: IMMUTABLE_SECONDS,
      });
      return tallyExport(unzipFirstEntry(zipped).toString('utf8'));
    } catch {
      // A missing or unreadable file costs one slot, never the reading. GDELT
      // does occasionally skip an interval; the counts below say how many
      // were read.
      return null;
    }
  };

  const results = await pool([...recent, ...baseline], CONCURRENCY, read);
  return {
    latest: new Date(latest).toISOString(),
    recent: results.slice(0, recent.length),
    baseline: results.slice(recent.length),
  };
}

// ---------------------------------------------------------------------------
// Tallies → what is changing
// ---------------------------------------------------------------------------

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function levelFor(reports: number, events: number, ratio: number, floored: boolean): ReportingLevel {
  if (reports < REPORTING_RULES.placeMinReports || events < REPORTING_RULES.minEvents) return 'normal';
  // "Surging" is a claim about a trend, and with no measurable normal there
  // is no trend to claim. In the fourth real run the Strait of Dover read
  // 90 reports against a normal of 0 — all of it one story syndicated across
  // a newspaper chain and placed in Folkestone. Such a place is still worth
  // a look, so it is elevated (a watch), never surging (an alert).
  if (floored) return ratio >= REPORTING_RULES.elevatedRatio ? 'elevated' : 'normal';
  if (ratio >= REPORTING_RULES.surgingRatio) return 'surging';
  if (ratio >= REPORTING_RULES.elevatedRatio) return 'elevated';
  return 'normal';
}

export function parseGdelt(raw: GdeltRaw): Reading<GdeltData> {
  const recentFiles = raw.recent.filter((t): t is FileTally => t !== null);
  const baselineFiles = raw.baseline.filter((t): t is FileTally => t !== null);

  if (recentFiles.length < MIN_RECENT_FILES) {
    throw new LiveSourceError(
      `Only ${recentFiles.length} of GDELT's last ${raw.recent.length} fifteen-minute files could be read — too few to compare.`,
    );
  }
  if (baselineFiles.length < MIN_BASELINE_FILES) {
    throw new LiveSourceError(
      `Only ${baselineFiles.length} of ${raw.baseline.length} baseline files could be read — too few to say what normal is.`,
    );
  }

  const R = merge(recentFiles);
  const B = merge(baselineFiles);

  // A file that parses into mostly-malformed rows means GDELT changed its
  // layout. Better no reading than counts from the wrong columns.
  const rows = R.rows + B.rows;
  if (rows === 0 || (R.malformed + B.malformed) / rows > 0.2) {
    throw new LiveSourceError("GDELT's event files did not match the 61-column layout this page reads.");
  }
  if (R.totalReports === 0 || B.totalReports === 0) {
    throw new LiveSourceError('GDELT files were read but contained no reporting to compare.');
  }

  /**
   * What `reports` is against normal. `expected` is always the measured
   * value; only the divisor is floored, and the result says when it was, so
   * the page never states the floor as a measured normal.
   */
  const compare = (reports: number, baseReports: number) => {
    const expected = (baseReports / B.totalReports) * R.totalReports;
    const floored = expected < REPORTING_RULES.minExpected;
    return { expected, floored, ratio: reports / Math.max(expected, REPORTING_RULES.minExpected) };
  };

  const hotspots: Hotspot[] = [];
  for (const [key, loc] of Object.entries(R.locations)) {
    if (loc.reports < REPORTING_RULES.hotspotMinReports) continue;
    if (loc.events < REPORTING_RULES.minEvents) continue;
    const { expected, floored, ratio } = compare(loc.reports, B.locations[key]?.reports ?? 0);
    if (ratio < REPORTING_RULES.hotspotMinRatio) continue;
    hotspots.push({
      key,
      name: loc.name,
      countryCode: loc.countryCode,
      countryName: countryName(loc.countryCode),
      lat: loc.lat,
      lon: loc.lon,
      reports: loc.reports,
      events: loc.events,
      expected,
      ratio,
      floored,
      nearest: nearestNode(loc.lat, loc.lon),
      sources: loc.sources
        .slice()
        .sort((a, b) => b.reports - a.reports)
        .reduce<SourceLink[]>((picked, s) => {
          // One link per publisher, so three links are three voices.
          const domain = domainOf(s.url);
          if (picked.length < SOURCES_PER_HOTSPOT && !picked.some((p) => p.domain === domain)) {
            picked.push({ url: s.url, domain });
          }
          return picked;
        }, []),
    });
  }
  // Ranked by excess reporting — how far above normal, in reports — so a big
  // place moderately up outranks a village that went from one article to five.
  hotspots.sort((a, b) => b.reports - b.expected - (a.reports - a.expected));

  const countries: CountrySurge[] = [];
  for (const [code, reports] of Object.entries(R.countries)) {
    if (reports < REPORTING_RULES.countryMinReports) continue;
    const { expected, floored, ratio } = compare(reports, B.countries[code] ?? 0);
    if (ratio < REPORTING_RULES.countryMinRatio) continue;
    countries.push({ code, name: countryName(code), reports, expected, ratio, floored });
  }
  countries.sort((a, b) => b.reports - b.expected - (a.reports - a.expected));

  const problems: ProblemTrend[] = PROBLEM_TYPES.map((type) => {
    const reports = R.problems[type.id] ?? 0;
    const share = reports / R.totalReports;
    const normalShare = (B.problems[type.id] ?? 0) / B.totalReports;
    return {
      id: type.id,
      label: type.label,
      reports,
      share,
      normalShare,
      ratio: normalShare > 0 ? share / normalShare : null,
    };
  }).sort((a, b) => {
    // Rising first; a type with reporting now and none normally ranks with
    // the risers; one with nothing either time goes last.
    const rank = (p: ProblemTrend) => p.ratio ?? (p.reports > 0 ? Number.POSITIVE_INFINITY : -1);
    return rank(b) - rank(a);
  });

  const places: PlaceReporting[] = ALL_NODES.map((node) => {
    const reports = R.places[node.id] ?? 0;
    const events = R.placeEvents[node.id] ?? 0;
    const { expected, floored, ratio } = compare(reports, B.places[node.id] ?? 0);
    return {
      nodeId: node.id,
      reports,
      events,
      expected,
      ratio,
      floored,
      level: levelFor(reports, events, ratio, floored),
    };
  });

  const notes = [
    'Counts are of news articles reporting conflict-type events, as coded automatically by GDELT. They measure how much is being written about a place, not how much is happening there, and automated geocoding sometimes places a story in the wrong city.',
  ];
  const missing = raw.recent.length - recentFiles.length + (raw.baseline.length - baselineFiles.length);
  if (missing > 0) {
    notes.push(
      `${missing} of ${raw.recent.length + raw.baseline.length} fifteen-minute files could not be read this cycle; the comparison uses the rest.`,
    );
  }

  const latest = Date.parse(raw.latest);
  return {
    status: 'ok',
    source: 'gdelt',
    // The newest file's own stamp: the data's time, taken from GDELT's file
    // name, never our clock.
    asOf: raw.latest,
    asOfBasis: 'latest GDELT fifteen-minute update',
    data: {
      windowStart: new Date(latest - (RECENT_SLOTS - 1) * SLOT_MS).toISOString(),
      windowEnd: new Date(latest + SLOT_MS).toISOString(),
      baselineDays: BASELINE_DAYS,
      recentFiles: recentFiles.length,
      recentFilesExpected: raw.recent.length,
      baselineFiles: baselineFiles.length,
      baselineFilesExpected: raw.baseline.length,
      totalReports: R.totalReports,
      conflictReports: R.conflictReports,
      hotspots: hotspots.filter((h) => !h.floored).slice(0, MAX_HOTSPOTS),
      noBaseline: hotspots.filter((h) => h.floored).slice(0, MAX_NO_BASELINE),
      countries: countries.slice(0, MAX_COUNTRIES),
      problems,
      places,
    },
    notes,
  };
}
