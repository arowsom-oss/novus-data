/**
 * Reads the disruption register from `content/disruptions/*.md`.
 *
 * Same shape as the issue content source, and the same guarantee: one bad file
 * warns and is skipped rather than taking down the build.
 *
 * What is different here is how much it throws away. A disruption without a
 * source is not published. An exposure without a mechanism, a confidence, an
 * as-of date and a source is not published. The chart can only draw what
 * survives this file, which is the whole point — see the note at the top of
 * ../types.ts.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import matter from 'gray-matter';

import { publication } from '@/config/publication';
// Pure reference data, not the live layer's network code: which place ids exist.
import { nodeById } from '@/lib/live/nodes';
import type {
  Confidence,
  Disruption,
  DisruptionCategory,
  DisruptionDiagnostics,
  DisruptionStatus,
  Entity,
  Exposure,
  Severity,
  Source,
} from '../types';
import {
  CONFIDENCES,
  DISRUPTION_CATEGORIES,
  DISRUPTION_STATUSES,
  ID_PATTERN,
  SEVERITIES,
} from '../types';

/**
 * Normally content/disruptions/ in this repository.
 *
 * NOVUS_DISRUPTIONS_DIR is its own variable rather than something derived from
 * NOVUS_CONTENT_DIR. An earlier version resolved this as a sibling of the
 * issues directory, which meant pointing the issues override anywhere moved the
 * register too — a surprise waiting to happen. Review tooling sets both
 * explicitly; neither should ever be set on Vercel.
 */
export const DISRUPTIONS_DIRECTORY = process.env.NOVUS_DISRUPTIONS_DIR
  ? path.resolve(process.env.NOVUS_DISRUPTIONS_DIR)
  : path.join(process.cwd(), 'content', 'disruptions');

interface ParsedFile {
  file: string;
  disruption: Disruption;
}

interface ReadResult {
  disruptions: Disruption[];
  warnings: string[];
  files: string[];
  parsed: ParsedFile[];
}

function warn(warnings: string[], message: string): void {
  warnings.push(message);
  console.warn(`[disruptions] ${message}`);
}

function text(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A register date, validated against what the author actually wrote and
 * normalised to `YYYY-MM-DD`.
 *
 * ---------------------------------------------------------------------------
 * THE DATE MUST BE A QUOTED STRING, AND THAT IS NOT PEDANTRY
 *
 * An unquoted YAML date is parsed by the YAML layer before this file ever sees
 * it, and js-yaml rolls impossible dates forward silently rather than refusing
 * them. Measured, not assumed:
 *
 *     updatedAt: 2026-02-30   ->  Date(2026-03-02)   a day that does not exist
 *     updatedAt: 2026-13-01   ->  Date(2027-01-01)   a YEAR out
 *
 * By the time such a value arrives here it is a perfectly valid Date and the
 * author's text is gone, so there is nothing left to check. Requiring a quoted
 * string keeps the text, which is the only thing that can be validated.
 *
 * §6a tells the reader to trust the review date over the freshness of the
 * page. A silently shifted date is therefore the worst kind of wrong this file
 * can emit: plausible, precise, and traceable to nobody.
 *
 * ---------------------------------------------------------------------------
 * AND THE STRING FORM IS NARROW ON PURPOSE
 *
 * `new Date(value)` accepts far more than a date, and disagrees with the
 * author on much of it:
 *
 *     "10/09/2026"       ->  9 October, not 10 September (V8 reads US order)
 *     "September 2026"   ->  1 September, a precision nobody wrote
 *     "2026"             ->  1 January
 *
 * The site formats in en-GB, so an author writing a slash date would
 * reasonably mean day-first and silently get the month. Only `YYYY-MM-DD` is
 * accepted — optionally with a time part, which is discarded, so a value
 * copied out of `/register.json` still loads.
 *
 * The round-trip check at the end is what rejects a day that does not exist:
 * `2026-02-30` parses fine and comes back as `2026-03-02`, which no longer
 * starts with what was written.
 */
function isoDate(raw: unknown, field: string, label: string, warnings: string[]): string | null {
  if (raw instanceof Date) {
    warn(
      warnings,
      `${label}: "${field}" must be quoted — write "YYYY-MM-DD" with the quotes. An unquoted ` +
        'YAML date is rolled over by the parser before it can be checked (2026-02-30 becomes ' +
        '2026-03-02, and 2026-13-01 becomes 2027-01-01), so the date you wrote cannot be verified.',
    );
    return null;
  }

  const value = text(raw);
  if (!value) return null;

  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/.exec(value);
  if (!match) {
    // The example is the value's own misreading where there is one, rather
    // than a fixed illustration: an author reading this is already confused
    // about their date, and citing someone else's is no help.
    const misread = new Date(value);
    const asRead = Number.isNaN(misread.getTime())
      ? 'is not read as a date at all'
      : `is read as ${misread.toISOString().slice(0, 10)}`;
    warn(
      warnings,
      `${label}: "${field}" is "${value}", which is not YYYY-MM-DD — it ${asRead}. ` +
        'Looser forms are read differently than they are written, so only YYYY-MM-DD ' +
        'is accepted.',
    );
    return null;
  }

  const day = match[1];
  const parsed = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(day)) {
    warn(warnings, `${label}: "${field}" is "${value}", which is not a date that exists.`);
    return null;
  }

  return day;
}

function oneOf<T extends string>(raw: unknown, allowed: T[]): T | null {
  const value = text(raw);
  return value && (allowed as string[]).includes(value) ? (value as T) : null;
}

/**
 * A source is only a source if it can be followed. A citation with no URL is a
 * claim with extra words.
 */
function parseSources(raw: unknown, label: string, warnings: string[]): Source[] {
  if (!Array.isArray(raw)) return [];
  const sources: Source[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;

    const title = text(record.title);
    const url = text(record.url);
    const publisher = text(record.publisher);
    const retrievedAt = isoDate(record.retrievedAt, 'retrievedAt', label, warnings);

    if (!title || !url || !publisher) {
      warn(warnings, `${label}: dropped a source missing title, url or publisher.`);
      continue;
    }
    if (!/^https?:\/\//i.test(url)) {
      warn(warnings, `${label}: dropped source "${title}" — url must be http(s).`);
      continue;
    }

    sources.push({ title, url, publisher, retrievedAt: retrievedAt ?? '' });
  }

  return sources;
}

function parseEntity(raw: unknown, label: string, warnings: string[]): Entity | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const id = text(record.id);
  const name = text(record.name);
  const sector = text(record.sector);
  const kind = oneOf(record.kind, ['company', 'sector'] as const);

  if (!id || !name || !sector || !kind) {
    warn(warnings, `${label}: dropped an exposure — entity needs id, name, kind and sector.`);
    return null;
  }
  if (!ID_PATTERN.test(id)) {
    warn(warnings, `${label}: dropped an exposure — entity id "${id}" is not URL-safe.`);
    return null;
  }

  return { id, name, kind, ticker: text(record.ticker), sector };
}

/**
 * The gate. An exposure that clears this becomes a coloured cell; anything else
 * is dropped with a warning that names the file and says which piece is absent.
 */
function parseExposures(raw: unknown, label: string, warnings: string[]): Exposure[] {
  if (!Array.isArray(raw)) return [];

  const exposures: Exposure[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;

    const entity = parseEntity(record.entity, label, warnings);
    if (!entity) continue;

    const where = `${label} → ${entity.name}`;

    const severity = oneOf<Severity>(record.severity, SEVERITIES);
    if (!severity) {
      warn(warnings, `${where}: dropped — severity must be one of ${SEVERITIES.join(', ')}.`);
      continue;
    }

    const confidence = oneOf<Confidence>(record.confidence, CONFIDENCES);
    if (!confidence) {
      warn(warnings, `${where}: dropped — confidence must be one of ${CONFIDENCES.join(', ')}.`);
      continue;
    }

    const mechanism = text(record.mechanism);
    if (!mechanism) {
      warn(
        warnings,
        `${where}: dropped — no mechanism. State how the disruption reaches this entity, or do not claim it does.`,
      );
      continue;
    }

    const asOf = isoDate(record.asOf, 'asOf', label, warnings);
    if (!asOf) {
      warn(warnings, `${where}: dropped — asOf must be a valid date. An undated assessment is not publishable.`);
      continue;
    }

    const sources = parseSources(record.sources, where, warnings);
    if (sources.length === 0) {
      warn(warnings, `${where}: dropped — an exposure needs at least one followable source.`);
      continue;
    }

    if (seen.has(entity.id)) {
      warn(warnings, `${where}: dropped — this entity already has an exposure on this disruption.`);
      continue;
    }

    seen.add(entity.id);
    exposures.push({ entity, severity, confidence, mechanism, asOf, sources });
  }

  return exposures;
}

function parseDisruptionFile(file: string, raw: string, warnings: string[]): Disruption | null {
  let data: Record<string, unknown>;
  let body: string;

  try {
    const parsed = matter(raw);
    data = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warn(warnings, `Skipped ${file}: frontmatter could not be parsed (${reason}).`);
    return null;
  }

  const id = text(data.id);
  if (!id || !ID_PATTERN.test(id)) {
    warn(warnings, `Skipped ${file}: needs a URL-safe "id" (lowercase, digits, single hyphens).`);
    return null;
  }

  const title = text(data.title);
  if (!title) {
    warn(warnings, `Skipped ${file}: needs a non-empty "title".`);
    return null;
  }

  const status = oneOf<DisruptionStatus>(data.status, DISRUPTION_STATUSES);
  if (!status) {
    warn(warnings, `Skipped ${file}: "status" must be one of ${DISRUPTION_STATUSES.join(', ')}.`);
    return null;
  }

  const category = oneOf<DisruptionCategory>(data.category, DISRUPTION_CATEGORIES);
  if (!category) {
    warn(warnings, `Skipped ${file}: "category" must be one of ${DISRUPTION_CATEGORIES.join(', ')}.`);
    return null;
  }

  const updatedAt = isoDate(data.updatedAt, 'updatedAt', file, warnings);
  if (!updatedAt) {
    warn(
      warnings,
      `Skipped ${file}: "updatedAt" must be a valid date. A tracked disruption with no review date cannot be shown as current.`,
    );
    return null;
  }

  const summary = text(data.summary);
  if (!summary) {
    warn(warnings, `Skipped ${file}: needs a "summary".`);
    return null;
  }

  const sources = parseSources(data.sources, file, warnings);
  if (sources.length === 0) {
    warn(warnings, `Skipped ${file}: a disruption needs at least one followable source.`);
    return null;
  }

  // Falls back to the first three letters of the id so a missing label never
  // blanks a chart column.
  const shortLabel = (text(data.shortLabel) ?? id.replace(/-/g, '').slice(0, 3)).toUpperCase();

  // Attribution. An id that is not on the masthead is a typo or a stale
  // reference; warn and fall back rather than rendering a name nobody owns.
  const rawAuthor = text(data.author);
  let author: string | null = null;
  if (rawAuthor) {
    if (publication.authors.some((person) => person.id === rawAuthor)) {
      author = rawAuthor;
    } else {
      warn(
        warnings,
        `${file}: "author" is "${rawAuthor}", which is not an id in publication.authors. The entry falls back to the editor's byline.`,
      );
    }
  }

  // Places. An id that is not a tracked place is a typo; warn and drop it
  // rather than linking a place board row that does not exist.
  const places: string[] = [];
  for (const raw of Array.isArray(data.places) ? data.places : []) {
    const place = typeof raw === 'string' ? raw.trim() : '';
    if (!place) continue;
    if (nodeById(place)) {
      if (!places.includes(place)) places.push(place);
    } else {
      warn(
        warnings,
        `${file}: "places" lists "${place}", which is not a tracked place. It was dropped. Tracked place ids are listed in src/lib/live/nodes.ts.`,
      );
    }
  }

  const contentHtml = body.trim();

  return {
    id,
    title,
    shortLabel,
    status,
    category,
    startedAt: isoDate(data.startedAt, 'startedAt', file, warnings) ?? '',
    updatedAt,
    summary,
    author,
    places,
    sources,
    exposures: parseExposures(data.exposures, file, warnings),
    contentHtml: contentHtml.length > 0 ? contentHtml : null,
  };
}

/** Active first, then by most recently reviewed. */
const STATUS_ORDER: Record<DisruptionStatus, number> = {
  active: 0,
  easing: 1,
  watch: 2,
  resolved: 3,
};

function compare(a: ParsedFile, b: ParsedFile): number {
  const byStatus = STATUS_ORDER[a.disruption.status] - STATUS_ORDER[b.disruption.status];
  if (byStatus !== 0) return byStatus;
  return (
    new Date(b.disruption.updatedAt).getTime() - new Date(a.disruption.updatedAt).getTime()
  );
}

async function readAll(): Promise<ReadResult> {
  const warnings: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(DISRUPTIONS_DIRECTORY);
  } catch {
    // No directory yet is an empty register, not an error.
    return { disruptions: [], warnings, files: [], parsed: [] };
  }

  const files = entries.filter((name) => name.endsWith('.md')).sort();
  const parsed: ParsedFile[] = [];
  const seenIds = new Map<string, string>();

  // Read in parallel, parsed in filename order, so warnings and the
  // first-occurrence rules below behave exactly as a sequential read would.
  const contents = await Promise.all(files.map((file) => readFile(path.join(DISRUPTIONS_DIRECTORY, file), 'utf8')));
  for (const [index, file] of files.entries()) {
    const raw = contents[index];
    const disruption = parseDisruptionFile(file, raw, warnings);
    if (!disruption) continue;

    const existing = seenIds.get(disruption.id);
    if (existing) {
      warn(warnings, `Skipped ${file}: id "${disruption.id}" is already used by ${existing}.`);
      continue;
    }

    seenIds.set(disruption.id, file);
    parsed.push({ file, disruption });
  }

  reconcileEntities(parsed, warnings);

  parsed.sort(compare);

  return { disruptions: parsed.map((entry) => entry.disruption), warnings, files, parsed };
}

/**
 * One entity id means one company, across every file.
 *
 * ---------------------------------------------------------------------------
 * THE BUG THIS FIXES, BECAUSE IT WILL LOOK LIKE OVER-ENGINEERING
 *
 * `entity.id` is written per-exposure, so the same company is described afresh
 * in every file that mentions it. Nothing previously checked that those
 * descriptions agreed. Two files naming `acme-freight` with different tickers
 * produced this, with no warning anywhere:
 *
 *     chart row   ->  Acme Freight            ZVZZT
 *     table below ->  Acme Freight Group plc  ZWZZT
 *
 * The chart and the entity page took whichever record loaded first — the
 * matrix keyed a Map by id and kept the first value it saw — while the table
 * view rendered each exposure's own copy. So one page showed one company under
 * two names and two tickers at the same time.
 *
 * On a site whose whole argument is that a claim about a named company can be
 * checked, that is not cosmetic: a reader who spots it has good reason to
 * conclude the register does not know which company it means.
 *
 * It is also a shape worth recognising — impossible with one register entry,
 * near-certain with twenty, and twenty entries with overlapping entities is
 * precisely what the exposure chart exists to draw. It was unreachable until
 * the register filled up.
 *
 * ---------------------------------------------------------------------------
 * WHY RECONCILE RATHER THAN REFUSE
 *
 * The rest of this file drops what it cannot verify, but the disagreement here
 * is over a display name, not over a claim: the mechanism, the confidence, the
 * date and the sources are all still intact and still checkable. Refusing the
 * exposure would throw away a sound assessment over a metadata typo.
 *
 * So the first occurrence in filename order wins — deterministic, and stable
 * between builds because `files` is sorted — every other mention is rewritten
 * to match, and the disagreement is warned about naming both files and both
 * values so it can actually be corrected. What must not survive is the site
 * contradicting itself on one page.
 */
function reconcileEntities(parsed: ParsedFile[], warnings: string[]): void {
  const canonical = new Map<string, { entity: Entity; file: string }>();

  for (const { file, disruption } of parsed) {
    for (const exposure of disruption.exposures) {
      const held = canonical.get(exposure.entity.id);

      if (!held) {
        canonical.set(exposure.entity.id, { entity: exposure.entity, file });
        continue;
      }

      const differs = (
        ['name', 'ticker', 'sector', 'kind'] as const
      ).filter((key) => held.entity[key] !== exposure.entity[key]);

      if (differs.length > 0) {
        const detail = differs
          .map((key) => `${key} "${exposure.entity[key] ?? ''}" vs "${held.entity[key] ?? ''}"`)
          .join(', ');
        warn(
          warnings,
          `${file}: entity "${exposure.entity.id}" disagrees with ${held.file} on ${detail}. ` +
            `Using ${held.file}'s version everywhere so the chart, the table and the entity ` +
            'page cannot show one company under two names. Correct whichever is wrong.',
        );
      }

      // Rewrite even when identical: one shared object per id keeps the
      // surfaces byte-identical rather than merely equal.
      exposure.entity = held.entity;
    }
  }
}

let cached: Promise<ReadResult> | null = null;

function load(): Promise<ReadResult> {
  if (process.env.NODE_ENV !== 'production') return readAll();
  cached ??= readAll();
  return cached;
}

export async function readDisruptions(): Promise<Disruption[]> {
  return (await load()).disruptions;
}

export async function readDisruptionDiagnostics(): Promise<DisruptionDiagnostics> {
  const { parsed, warnings, files } = await readAll();

  return {
    directory: path.relative(process.cwd(), DISRUPTIONS_DIRECTORY),
    fileCount: files.length,
    warnings,
    entries: parsed.map(({ file, disruption }) => ({
      file,
      id: disruption.id,
      title: disruption.title,
      status: disruption.status,
      updatedAt: disruption.updatedAt,
      dateParsed: !Number.isNaN(new Date(disruption.updatedAt).getTime()),
      sourceCount: disruption.sources.length,
      exposureCount: disruption.exposures.length,
      bodyLength: disruption.contentHtml?.length ?? 0,
    })),
  };
}
