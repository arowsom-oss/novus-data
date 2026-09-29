/**
 * The live data layer — types and constants.
 *
 * Pure data, no side effects, no imports from ./sources. Safe to import from a
 * client component, which is why components take their labels from here rather
 * than from ../index.ts (the same split §6a keeps for the register).
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE THIS LAYER EXISTS TO ENFORCE
 *
 * A reading's age comes from a timestamp INSIDE the upstream data — the time
 * the feed says it was generated, the latest observation it contains — and
 * never from when our code happened to run.
 *
 * That is not pedantry. Every fetch here is cached for fifteen minutes, pages
 * are regenerated in the background, a CDN may sit in front of them, and a
 * reader may leave the tab open overnight. At every one of those layers, a
 * value can be served long after it arrived. If its age were stamped with our
 * own clock at render time, a two-hour-old cached number would describe itself
 * as current — which is precisely the failure §14.1 says would "destroy more
 * credibility than this whole site builds". A timestamp that travels inside
 * the data cannot be falsified by any cache that serves it.
 *
 * The age itself is then computed in the reader's browser, against the
 * reader's clock, at the moment they look (see components/live-age.tsx). The
 * server only ever renders the absolute time, which stays true forever — the
 * same move §6a makes for the register's review dates.
 * ---------------------------------------------------------------------------
 */

/**
 * How often pages and feeds in this layer are regenerated, in seconds.
 *
 * Exported for display and documentation only. Route segment configs must
 * write the literal `900`: Next 16 requires `revalidate` to be statically
 * analysable, and a value imported from here would be silently ignored.
 */
export const LIVE_REVALIDATE_SECONDS = 900;

/** Distance within which a hazard is flagged as near a trade node. A display rule, stated on the page. */
export const PROXIMITY_KM = 300;

export type LiveSourceId =
  | 'ais'
  | 'gdelt'
  | 'usgs'
  | 'gdacs'
  | 'nhc'
  | 'eonet'
  | 'weather'
  | 'fred'
  | 'quotes';

export const LIVE_SOURCE_IDS: LiveSourceId[] = [
  'gdelt',
  'ais',
  'usgs',
  'gdacs',
  'nhc',
  'eonet',
  'weather',
  'fred',
  'quotes',
];

/**
 * How a source's readings age. Kept apart from the rest of `SourceMeta` so the
 * one client component that needs it (live-age) ships these few numbers
 * rather than every source's names and terms text.
 */
export interface SourceClock {
  /** Minutes after `asOf` at which a reading is shown as delayed, then stale. */
  delayedAfterMinutes: number;
  staleAfterMinutes: number;
  /**
   * 'day' for a source whose values are dated, not timed — a daily settlement
   * price. Printing "00:00 UTC" beside one would claim a precision nobody
   * published.
   */
  asOfPrecision: 'minute' | 'day';
}

/** What is known about a source before any data is fetched. */
export interface SourceMeta extends SourceClock {
  id: LiveSourceId;
  /** The product name, as the publisher uses it. */
  name: string;
  publisher: string;
  /** What the page reads from it, in a phrase: "Earthquakes, magnitude 4.5 and above". */
  measures: string;
  /** A followable page for the source. §6a: a source you cannot follow is not a source. */
  homepage: string;
  /** Update cadence in plain words, as the publisher states it. */
  cadence: string;
  /**
   * Terms, as far as they were verified. Where they were NOT verified this
   * says so rather than guessing — the data is republished, so the terms
   * matter, and an invented licence line is worse than an honest "check".
   */
  terms: string;
  /** Server-side environment variable required, or null for keyless sources. */
  requiresEnv: string | null;
}

/**
 * The outcome of asking one source for data. Exactly three shapes, and the
 * page must render all three — there is no fourth shape that means "show a
 * placeholder number".
 */
export type Reading<T> =
  | {
      status: 'ok';
      source: LiveSourceId;
      /** ISO 8601. Taken from inside the payload — see the rule at the top. */
      asOf: string;
      /** What `asOf` actually is, in words: "feed generated", "latest vessel message". */
      asOfBasis: string;
      data: T;
      /** Partial failures and caveats, in plain words. Shown on the page. */
      notes: string[];
    }
  | {
      status: 'unavailable';
      source: LiveSourceId;
      /** Safe to display: constructed by us, never an upstream error body or a secret. */
      reason: string;
    }
  | {
      status: 'not-configured';
      source: LiveSourceId;
      /** The environment variable that would enable it. */
      envVar: string;
    };

// ---------------------------------------------------------------------------
// Trade nodes — the reference geometry hazards are measured against
// ---------------------------------------------------------------------------

export type TradeNodeKind = 'chokepoint' | 'port' | 'industrial';

/** [[south, west], [north, east]] in decimal degrees — AISStream's corner order is [lat, lon]. */
export type BoundingBox = [[number, number], [number, number]];

export interface TradeNode {
  id: string;
  name: string;
  kind: TradeNodeKind;
  /** Approximate centre, used for distances. */
  lat: number;
  lon: number;
  /** Chokepoints only: the box vessel positions are sampled within. */
  box?: BoundingBox;
  /** Plain-words caveat shown beside the node, e.g. on receiver coverage. */
  note?: string;
  /**
   * How far from this place a news story may be geocoded and still count
   * toward its conflict reporting, when the default for its kind
   * (REPORTING_RULES) would take in a large city whose news is not about the
   * place. `exclude` names places GDELT geocodes to that fall inside the
   * radius but must not count — matched against the start of GDELT's full
   * place name. `why` is printed on the page.
   */
  reporting?: { km: number; exclude?: string[]; why: string };
}

/** The nearest trade node to a point, for "180 km from Port of Busan". A distance, never an impact claim. */
export interface NearestNode {
  nodeId: string;
  nodeName: string;
  km: number;
}

// ---------------------------------------------------------------------------
// Per-source data shapes
// ---------------------------------------------------------------------------

export interface ChokepointSample {
  nodeId: string;
  /** Distinct vessels (MMSI) heard in the box during the sample window. */
  vesselsObserved: number;
  /** Of those, how many reported speed over ground of at least 1 knot. */
  vesselsUnderway: number;
  /** Raw message count, for judging whether a zero means anything. */
  messages: number;
}

export interface AisData {
  windowSeconds: number;
  sampledAt: string;
  chokepoints: ChokepointSample[];
}

// --- GDELT: where reporting is rising against its own normal --------------

/**
 * The thresholds the change detection uses. Published on /monitor and at
 * /about#live, so a reader can check any flag against the rule that raised
 * it. Change them here and both pages follow.
 *
 * "Reports" throughout means GDELT's NumArticles: the number of source
 * articles that mentioned a conflict-type event geocoded to the place. It
 * measures how much is being written, not how much is happening.
 */
export const REPORTING_RULES = {
  /** A city-level location is a hotspot at this many reports in the window… */
  hotspotMinReports: 20,
  /** …and at least this multiple of its normal share of all reporting. */
  hotspotMinRatio: 3,
  /**
   * A hotspot, or any level above normal at a tracked place, also needs its
   * reports spread across at least this many separately coded events. GDELT
   * counts the articles behind each event, so one miscoded or widely
   * syndicated story can carry hundreds of reports on its own; three events
   * means the count rests on more than one thing having been written.
   */
  minEvents: 3,
  countryMinReports: 50,
  countryMinRatio: 2,
  /** Near a tracked place: below this many reports, no level is claimed. */
  placeMinReports: 10,
  /**
   * How close a story must be geocoded to count for a place, unless the
   * place sets its own (`TradeNode.reporting`, narrower where a large
   * unrelated city falls inside the default — London is 126 km from the
   * Dover Strait). Tighter than
   * the hazard radius (PROXIMITY_KM), because news is geocoded to a city and
   * a wide radius double-counts: at 300 km one strike in Rotterdam raised
   * alerts for Rotterdam, Antwerp and the Strait of Dover. Chokepoints get
   * more room because attacks on shipping are usually placed at the nearest
   * coastal city — Aden for Bab el-Mandeb is about 180 km. Within reach, a
   * story counts only for the nearest port or cluster and the nearest
   * chokepoint (`placesCounting()` in sources/gdelt.ts).
   */
  portRadiusKm: 100,
  chokepointRadiusKm: 200,
  elevatedRatio: 2,
  surgingRatio: 3,
  /**
   * The smallest "normal" a multiple is ever divided by, so a place with
   * almost no reporting in the baseline reads as large rather than infinite.
   * When it applies, the comparison is marked `floored`: the multiple is then
   * a lower bound, and the page says "fewer than 2 would be normal" rather
   * than stating the floor as though it had been measured.
   */
  minExpected: 2,
} as const;

export interface SourceLink {
  url: string;
  domain: string;
}

/** A city-level location reporting far above its own normal. */
export interface Hotspot {
  key: string;
  /** As GDELT's geocoder names it, e.g. "Aden, Adan, Yemen". */
  name: string;
  countryCode: string | null;
  countryName: string | null;
  lat: number;
  lon: number;
  /** Conflict reports in the recent window. */
  reports: number;
  /** Separately coded events those reports are spread across. */
  events: number;
  /** Reports the location would have had at its normal share. Measured, never floored. */
  expected: number;
  /** reports ÷ expected, or ÷ REPORTING_RULES.minExpected when `floored`. */
  ratio: number;
  /** Normal was below minExpected, so `ratio` is a lower bound. */
  floored: boolean;
  nearest: NearestNode | null;
  /** Up to three articles behind the count — the reporting itself, unverified. */
  sources: SourceLink[];
}

export interface CountrySurge {
  code: string;
  name: string;
  reports: number;
  expected: number;
  ratio: number;
  floored: boolean;
}

/** One kind of problem — strikes, blockades, sanctions — and how its share moved. */
export interface ProblemTrend {
  id: string;
  label: string;
  reports: number;
  /** Share of all reporting in the recent window. */
  share: number;
  /** The same share across the baseline. */
  normalShare: number;
  /** share ÷ normalShare, or null when there is no baseline to divide by. */
  ratio: number | null;
}

export type ReportingLevel = 'normal' | 'elevated' | 'surging';

export const REPORTING_LEVEL_LABELS: Record<ReportingLevel, string> = {
  normal: 'Normal',
  elevated: 'Elevated',
  surging: 'Surging',
};

/** Conflict reporting geocoded near a tracked place (REPORTING_RULES radii). */
export interface PlaceReporting {
  nodeId: string;
  reports: number;
  events: number;
  expected: number;
  ratio: number;
  floored: boolean;
  level: ReportingLevel;
}

export interface GdeltData {
  /** The recent window compared against the baseline. */
  windowStart: string;
  windowEnd: string;
  baselineDays: number;
  recentFiles: number;
  recentFilesExpected: number;
  baselineFiles: number;
  baselineFilesExpected: number;
  /** All reporting in the recent window, every kind of event — the denominator. */
  totalReports: number;
  conflictReports: number;
  /** Cities above a measured normal. These can raise flags. */
  hotspots: Hotspot[];
  /**
   * Cities with no measurable normal — almost no reporting at this time of
   * day all week — that now clear the report and event thresholds. Listed for
   * checking, never flagged: in the first real runs every one was a single
   * story syndicated across a newspaper group or a place the geocoder misread.
   */
  noBaseline: Hotspot[];
  countries: CountrySurge[];
  problems: ProblemTrend[];
  places: PlaceReporting[];
}

export interface Quake {
  id: string;
  magnitude: number;
  place: string;
  at: string;
  url: string;
  lat: number;
  lon: number;
  depthKm: number | null;
  tsunamiFlag: boolean;
  /** USGS PAGER alert level, if issued: green | yellow | orange | red. */
  pagerAlert: string | null;
  nearest: NearestNode | null;
}

export interface UsgsData {
  minMagnitude: number;
  windowHours: number;
  quakes: Quake[];
}

/** The GDACS alert levels read. Green is excluded — see sources/gdacs.ts. */
export type GdacsLevel = 'Orange' | 'Red';

export interface HazardAlert {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  level: GdacsLevel;
  country: string | null;
  from: string | null;
  to: string | null;
  updated: string | null;
  url: string | null;
  lat: number | null;
  lon: number | null;
  nearest: NearestNode | null;
}

export interface GdacsData {
  levels: readonly GdacsLevel[];
  alerts: HazardAlert[];
}

export interface Storm {
  id: string;
  name: string;
  classification: string;
  classificationLabel: string;
  intensityKt: number | null;
  pressureMb: number | null;
  lat: number;
  lon: number;
  updated: string;
  advisoryUrl: string | null;
  nearest: NearestNode | null;
}

export interface NhcData {
  storms: Storm[];
}

export interface NaturalEvent {
  id: string;
  title: string;
  category: string;
  at: string;
  lat: number;
  lon: number;
  url: string | null;
  nearest: NearestNode | null;
}

export interface EonetData {
  totalOpen: number;
  /** Only events within PROXIMITY_KM of a trade node — the rest is noise for this page. */
  nearTradeNodes: NaturalEvent[];
}

export interface PortWind {
  nodeId: string;
  windMs: number;
  gustMs: number | null;
  beaufort: number;
  beaufortLabel: string;
  at: string;
}

export interface WeatherData {
  ports: PortWind[];
}

// --- Prices ----------------------------------------------------------------

export type PriceUnit = 'usd-bbl' | 'usd-mmbtu' | 'usd-gal' | 'index';

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  'usd-bbl': 'US$ per barrel',
  'usd-mmbtu': 'US$ per million Btu',
  'usd-gal': 'US$ per gallon',
  index: 'index',
};

export interface PricePoint {
  /** The observation date as the publisher states it, YYYY-MM-DD. */
  date: string;
  value: number;
}

/** A public-domain price series — EIA and Federal Reserve data, served by FRED. */
export interface PriceSeries {
  id: string;
  label: string;
  /** Who produced the number, not who served it. */
  origin: string;
  unit: PriceUnit;
  cadence: 'daily' | 'weekly';
  /** Oldest first. Roughly six months. */
  points: PricePoint[];
  latest: PricePoint;
  /** Per cent change against the observation about a week and a month earlier. */
  changeWeek: number | null;
  changeMonth: number | null;
  /** The series page on FRED, where the number can be checked. */
  sourceUrl: string;
}

export interface FredData {
  series: PriceSeries[];
}

/** A listed security's last price. Only shown when a licensed key is configured. */
export interface Quote {
  symbol: string;
  label: string;
  price: number;
  previousClose: number | null;
  changePct: number | null;
  /** The provider's timestamp for the price — not when we asked. */
  at: string;
}

export interface QuotesData {
  quotes: Quote[];
  /** Symbols asked for that the provider returned nothing for. */
  missing: string[];
}

export interface LiveSnapshot {
  /** When this page's data was assembled. The page is regenerated every fifteen minutes. */
  generatedAt: string;
  ais: Reading<AisData>;
  gdelt: Reading<GdeltData>;
  usgs: Reading<UsgsData>;
  gdacs: Reading<GdacsData>;
  nhc: Reading<NhcData>;
  eonet: Reading<EonetData>;
  weather: Reading<WeatherData>;
  fred: Reading<FredData>;
  quotes: Reading<QuotesData>;
}

// --- Derived: flags and the place board -------------------------------------

/**
 * A flag is a rule firing on a reading — never a judgement. Each one carries
 * the rule in words, the reading's own time and a link to the source, so a
 * reader can check it without trusting us. Nothing here is an assessment;
 * assessments live in the register.
 */
export type FlagLevel = 'alert' | 'watch';

export const FLAG_LEVEL_LABELS: Record<FlagLevel, string> = {
  alert: 'Alert',
  watch: 'Watch',
};

export interface LiveFlag {
  /** Stable across regenerations while the condition holds — a watcher diffs on it. */
  id: string;
  level: FlagLevel;
  title: string;
  /** The reading, in a sentence. */
  detail: string;
  /** The rule that fired, in words. */
  rule: string;
  source: LiveSourceId;
  /** The reading's own time. */
  at: string;
  placeId: string | null;
  href: string | null;
}

/** Everything the live feeds say about one tracked place, in one row. */
export interface PlaceSummary {
  nodeId: string;
  reporting: PlaceReporting | null;
  quakes: { count: number; maxMagnitude: number | null };
  alerts: { count: number; worst: GdacsLevel | null };
  storms: { count: number; nearestKm: number | null };
  events: number;
  wind: { windMs: number; beaufort: number; label: string } | null;
  vessels: { underway: number; heard: number } | null;
  flags: number;
}

// ---------------------------------------------------------------------------
// Labels — pure, safe for client components
// ---------------------------------------------------------------------------

export type Freshness = 'live' | 'delayed' | 'stale';

export const FRESHNESS_LABELS: Record<Freshness, string> = {
  live: 'Live',
  delayed: 'Delayed',
  stale: 'Stale',
};

/** Freshness from an age in minutes. Pure, so the client and a test can agree. */
export function freshnessFor(
  ageMinutes: number,
  meta: Pick<SourceClock, 'delayedAfterMinutes' | 'staleAfterMinutes'>,
): Freshness {
  if (ageMinutes >= meta.staleAfterMinutes) return 'stale';
  if (ageMinutes >= meta.delayedAfterMinutes) return 'delayed';
  return 'live';
}

/**
 * The WMO Beaufort scale, on mean wind speed at 10 m in m/s. A published
 * standard rather than a threshold of ours, which is why the page can use it
 * to rank ports without making a claim about any terminal's operations.
 */
export const BEAUFORT: Array<{ force: number; minMs: number; label: string }> = [
  { force: 0, minMs: 0, label: 'Calm' },
  { force: 1, minMs: 0.5, label: 'Light air' },
  { force: 2, minMs: 1.6, label: 'Light breeze' },
  { force: 3, minMs: 3.4, label: 'Gentle breeze' },
  { force: 4, minMs: 5.5, label: 'Moderate breeze' },
  { force: 5, minMs: 8.0, label: 'Fresh breeze' },
  { force: 6, minMs: 10.8, label: 'Strong breeze' },
  { force: 7, minMs: 13.9, label: 'Near gale' },
  { force: 8, minMs: 17.2, label: 'Gale' },
  { force: 9, minMs: 20.8, label: 'Strong gale' },
  { force: 10, minMs: 24.5, label: 'Storm' },
  { force: 11, minMs: 28.5, label: 'Violent storm' },
  { force: 12, minMs: 32.7, label: 'Hurricane force' },
];

export function beaufortFor(windMs: number): { force: number; label: string } {
  let match = BEAUFORT[0];
  for (const step of BEAUFORT) {
    if (windMs >= step.minMs) match = step;
  }
  return { force: match.force, label: match.label };
}
