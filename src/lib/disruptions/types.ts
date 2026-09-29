/**
 * The disruption register and the exposure model behind the exposure chart.
 *
 * This is the second typed content layer, built to the pattern CLAUDE.md §14.1
 * lays out: its own types, its own sources, its own public API. It is
 * deliberately NOT merged into the issue content layer — an issue is a document
 * and a disruption is a tracked state with an as-of date, and they fail in
 * different ways.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE IS SO STRICT
 *
 * The exposure chart tells a reader that a named problem reaches a named
 * company. On a site about markets, someone may act on that. So the rule is:
 * a claim that cannot be checked does not render.
 *
 * Every exposure must carry four things or it is dropped at load time, with a
 * warning naming the file:
 *
 *   1. a mechanism  — the sentence explaining HOW the problem reaches the
 *                     company. "Affected" is not a finding; "routes roughly a
 *                     fifth of its Asia–Europe volume through the canal" is.
 *   2. a confidence — whether this is reported, inferred, or estimated.
 *   3. an asOf date — when the assessment was last true.
 *   4. at least one source — with a URL and a publisher.
 *
 * There is no way to produce a coloured cell without all four. That constraint
 * is the product, not an obstacle to it.
 * ---------------------------------------------------------------------------
 */

/** A citation. Every claim on this site traces back to at least one. */
export interface Source {
  title: string;
  url: string;
  /** Who published it — "Panama Canal Authority", not "the internet". */
  publisher: string;
  /** ISO date the source was read. Sources move; this records when it said this. */
  retrievedAt: string;
}

/** Where a disruption is in its life. Drives the register and the chart. */
export type DisruptionStatus =
  /** Not yet disrupting, but the conditions are in place. */
  | 'watch'
  /** Currently constraining trade. */
  | 'active'
  /** Still present, measurably improving. */
  | 'easing'
  /** Over. Kept in the register because the record matters. */
  | 'resolved';

export const DISRUPTION_STATUSES: DisruptionStatus[] = ['watch', 'active', 'easing', 'resolved'];

/** What kind of problem it is. Matches the beat described on /coverage. */
export type DisruptionCategory =
  | 'chokepoint'
  | 'port'
  | 'policy'
  | 'input'
  | 'energy'
  | 'labour'
  | 'weather';

export const DISRUPTION_CATEGORIES: DisruptionCategory[] = [
  'chokepoint',
  'port',
  'policy',
  'input',
  'energy',
  'labour',
  'weather',
];

export const CATEGORY_LABELS: Record<DisruptionCategory, string> = {
  chokepoint: 'Chokepoint',
  port: 'Port and terminal',
  policy: 'Trade policy',
  input: 'Industrial input',
  energy: 'Energy and fuel',
  labour: 'Labour',
  weather: 'Weather and climate',
};

export const STATUS_LABELS: Record<DisruptionStatus, string> = {
  watch: 'Watch',
  active: 'Active',
  easing: 'Easing',
  resolved: 'Resolved',
};

/**
 * How hard a disruption reaches a given company or sector.
 *
 * Three ordered levels, no more. A finer scale would imply a precision that
 * reading public sources cannot support, and the chart would be claiming more
 * than it knows.
 */
export type Severity = 'low' | 'moderate' | 'high';

/** Ordered low → high. The chart's ordinal ramp follows this order. */
export const SEVERITIES: Severity[] = ['low', 'moderate', 'high'];

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

/**
 * The rule for every permanent id in the register — a disruption's, an
 * entity's: lowercase letters, digits and single hyphens. It is enforced at
 * load time, so the URL space under /disruptions and /entities is too.
 */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SEVERITY_RANK: Record<Severity, number> = { low: 1, moderate: 2, high: 3 };

/** The strongest severity among some exposures — a real maximum, never a blend. `low` when there are none. */
export function worstOf(exposures: Array<{ severity: Severity }>): Severity {
  return exposures.reduce<Severity>(
    (worst, exposure) => (SEVERITY_RANK[exposure.severity] > SEVERITY_RANK[worst] ? exposure.severity : worst),
    'low',
  );
}

/**
 * How the exposure was established. This is the difference between reporting
 * and guessing, and the chart shows it rather than burying it.
 */
export type Confidence =
  /** The company or a regulator said so, or a named report documents it. */
  | 'reported'
  /** Follows from disclosed facts — a filing, a route map, a customer list. */
  | 'inferred'
  /** A judgement from partial information. The weakest claim the site will print. */
  | 'estimated';

export const CONFIDENCES: Confidence[] = ['reported', 'inferred', 'estimated'];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  reported: 'Reported',
  inferred: 'Inferred',
  estimated: 'Estimated',
};

export const CONFIDENCE_NOTES: Record<Confidence, string> = {
  reported: 'Stated by the company, a regulator, or a named report.',
  inferred: 'Follows from disclosed facts such as filings or published routings.',
  estimated: 'A judgement from partial information. Treat as the weakest claim here.',
};

/** A company or a sector. Sectors are honest where company detail is not known. */
export type EntityKind = 'company' | 'sector';

export interface Entity {
  /** Stable, URL-safe, permanent. Used as an anchor and as a chart key. */
  id: string;
  name: string;
  kind: EntityKind;
  /** Listing ticker, when there is one. Never invented. */
  ticker: string | null;
  /** Plain-language sector. Used to group the chart. */
  sector: string;
}

export interface Exposure {
  entity: Entity;
  severity: Severity;
  confidence: Confidence;
  /** HOW the disruption reaches this entity. Required; no cell without it. */
  mechanism: string;
  /** ISO date this assessment was last true. Required. */
  asOf: string;
  /** At least one. Required. */
  sources: Source[];
}

export interface DisruptionSummary {
  id: string;
  title: string;
  /** Two or three characters for the chart's column headers, e.g. "PAN". */
  shortLabel: string;
  status: DisruptionStatus;
  category: DisruptionCategory;
  /** ISO date the disruption began. */
  startedAt: string;
  /** ISO date the entry was last reviewed. Drives the staleness warning. */
  updatedAt: string;
  /** One or two sentences. Plain, no figures that are not in the sources. */
  summary: string;
  /**
   * Which author made this assessment — an `id` from `publication.authors`,
   * or null to fall back to the editor.
   *
   * On a one-person publication this is noise and stays null. It stops being
   * noise the moment a second person writes an entry: "who made this call"
   * becomes unanswerable from a site-wide byline, and being answerable is the
   * whole claim this register makes. An unknown id is warned about and
   * nulled rather than rendered, because inventing an attribution is worse
   * than falling back to the masthead.
   */
  author: string | null;
  /**
   * Tracked places this disruption concerns — ids from the live layer's
   * reference points (src/lib/live/nodes.ts), e.g. "suez", "rotterdam".
   * Optional. It is what lets the monitor's place board show a register
   * entry beside the live readings for the same place, and it is a statement
   * about geography only: naming a port here says nothing about any company.
   */
  places: string[];
  sources: Source[];
  exposures: Exposure[];
}

export interface Disruption extends DisruptionSummary {
  /** Sanitised analysis body. Null when the entry is a register line only. */
  contentHtml: string | null;
}

/** One row of the exposure chart: an entity and everything reaching it. */
export interface EntityExposure {
  entity: Entity;
  /** Keyed by disruption id. Absent means no exposure has been established. */
  byDisruption: Map<string, Exposure>;
  /** The worst severity recorded against this entity. Drives row ordering. */
  worstSeverity: Severity;
  /** How many disruptions reach it. */
  count: number;
}

/** Reported by /debug/content so a bad register file is visible immediately. */
export interface DisruptionDiagnostics {
  directory: string;
  fileCount: number;
  entries: Array<{
    file: string;
    id: string;
    title: string;
    status: DisruptionStatus;
    updatedAt: string;
    dateParsed: boolean;
    sourceCount: number;
    exposureCount: number;
    bodyLength: number;
  }>;
  warnings: string[];
}

/**
 * An entry reviewed longer ago than this is shown as stale rather than current.
 *
 * The alternative — quietly presenting a month-old assessment as today's — is
 * the single fastest way for a site like this to mislead someone.
 *
 * NOTE ON WHEN THIS IS EVALUATED. Pages are statically generated, so "now" is
 * the build time, not the moment someone reads the page. That means a day
 * count rendered here can only ever *understate* how old an assessment is —
 * the dangerous direction. So the UI never prints a live-sounding day count:
 * it prints the absolute review date, which is true forever, and phrases the
 * warning relative to the build ("had not been reviewed when this page was
 * built"). Keep it that way unless the page stops being static.
 */
export const STALE_AFTER_DAYS = 21;

/**
 * Whole days from a `YYYY-MM-DD` date to `now`, counted from UTC midnight;
 * null if the value does not start with one. Negative for a future date,
 * which is worth surfacing rather than clamping — a review date in the future
 * is a typo.
 *
 * The site, `doctor` and `review` all measure age with this one function.
 * They once had a copy each, and the copies disagreed on a full timestamp:
 * the site marked an entry stale while `doctor`, reading null as "no age",
 * left it off its list — silent, in exactly the direction that matters.
 */
export function daysSince(iso: string, now: Date = new Date()): number | null {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(iso)?.[1];
  if (!day) return null;
  const then = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function isStale(iso: string, now?: Date): boolean {
  const days = daysSince(iso, now);
  return days !== null && days > STALE_AFTER_DAYS;
}
