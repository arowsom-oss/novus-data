/**
 * The public API for the disruption register and the exposure chart.
 *
 * Pages import from here and never from ./sources — the same boundary the
 * issue content layer keeps, enforced by the same lint rule.
 */

import type {
  Disruption,
  DisruptionSummary,
  Entity,
  EntityExposure,
  Exposure,
  Severity,
} from './types';
import { SEVERITY_RANK, worstOf } from './types';
import { readFromActiveSource } from './sources';

export * from './types';
export { getDisruptionSourceName } from './sources';

/** Drop the body, so a list page never ships every entry's full analysis. */
function toSummary(disruption: Disruption): DisruptionSummary {
  const { contentHtml: _contentHtml, ...summary } = disruption;
  return summary;
}

/**
 * Everything in the register, active first, then most recently reviewed.
 *
 * Returns summaries, not full entries: the home page and /disruptions both
 * render every entry, and shipping each one's sanitised analysis body into
 * those payloads would grow the page with content nothing on it displays.
 * Use getDisruption() when you need the body.
 */
export async function listDisruptions(): Promise<DisruptionSummary[]> {
  return (await readFromActiveSource()).map(toSummary);
}

export async function getDisruption(id: string): Promise<Disruption | null> {
  const all = await readFromActiveSource();
  return all.find((entry) => entry.id === id) ?? null;
}

export async function listDisruptionIds(): Promise<string[]> {
  return (await readFromActiveSource()).map((entry) => entry.id);
}

/** The chart's shape: entity rows against disruption columns. */
export interface ExposureMatrix {
  /** Chart columns, in register order. */
  disruptions: DisruptionSummary[];
  /** Chart rows, worst-exposed first. */
  rows: EntityExposure[];
  /** Rows grouped by the entity's sector, for the mobile and table views. */
  bySector: Array<{ sector: string; rows: EntityExposure[] }>;
  /** Every exposure, flattened — backs the table view. */
  all: Array<{ disruption: DisruptionSummary; exposure: Exposure }>;
  /** How many distinct entities and claims the chart is drawing. */
  entityCount: number;
  exposureCount: number;
}

/**
 * Worst severity, then reach, then name — the chart's row order. /entities
 * sorts with the same comparator, so the two pages agree about which names
 * matter most, and the order is stable between builds.
 */
function mostExposedFirst<T extends { entity: Entity; worstSeverity: Severity | null }>(reach: (row: T) => number) {
  const rank = (severity: Severity | null) => (severity ? SEVERITY_RANK[severity] : 0);
  return (a: T, b: T): number =>
    rank(b.worstSeverity) - rank(a.worstSeverity) ||
    reach(b) - reach(a) ||
    a.entity.name.localeCompare(b.entity.name);
}

/**
 * Build the matrix.
 *
 * Rows are ordered by worst severity, then by how many disruptions reach the
 * entity, then alphabetically — so the most exposed names are at the top where
 * a reader looks first, and the order is stable between builds.
 */
export async function buildExposureMatrix(options?: {
  /** Include resolved disruptions. Default false — the chart shows live risk. */
  includeResolved?: boolean;
}): Promise<ExposureMatrix> {
  const includeResolved = options?.includeResolved ?? false;
  const all = (await readFromActiveSource()).map(toSummary);
  const disruptions = includeResolved ? all : all.filter((entry) => entry.status !== 'resolved');

  const byEntity = new Map<
    string,
    { entity: Entity; byDisruption: Map<string, Exposure>; exposures: Exposure[] }
  >();
  const flattened: Array<{ disruption: DisruptionSummary; exposure: Exposure }> = [];

  for (const disruption of disruptions) {
    for (const exposure of disruption.exposures) {
      flattened.push({ disruption, exposure });

      const existing = byEntity.get(exposure.entity.id);
      if (existing) {
        existing.byDisruption.set(disruption.id, exposure);
        existing.exposures.push(exposure);
      } else {
        byEntity.set(exposure.entity.id, {
          entity: exposure.entity,
          byDisruption: new Map([[disruption.id, exposure]]),
          exposures: [exposure],
        });
      }
    }
  }

  const rows: EntityExposure[] = [...byEntity.values()]
    .map(({ entity, byDisruption, exposures }) => ({
      entity,
      byDisruption,
      worstSeverity: worstOf(exposures),
      count: exposures.length,
    }))
    .sort(mostExposedFirst((row) => row.count));

  const sectors = new Map<string, EntityExposure[]>();
  for (const row of rows) {
    const bucket = sectors.get(row.entity.sector);
    if (bucket) bucket.push(row);
    else sectors.set(row.entity.sector, [row]);
  }

  return {
    disruptions,
    rows,
    bySector: [...sectors.entries()]
      .map(([sector, sectorRows]) => ({ sector, rows: sectorRows }))
      .sort((a, b) => a.sector.localeCompare(b.sector)),
    all: flattened,
    entityCount: rows.length,
    exposureCount: flattened.length,
  };
}

/* ---------------------------------------------------------------------------
   Entities

   An entity — a company or a sector — is the second thing a reader arrives
   looking for, after a disruption. Somebody searching a company name wants
   "what reaches this name, and how well established is it", which is a
   different question from "what is going wrong", and it deserves its own URL.

   It is also the thing a reader would follow once accounts exist: a watchlist
   needs a stable, canonical id to hold, and `entity.id` already is one.
   --------------------------------------------------------------------------- */

/** One exposure, paired with the disruption it belongs to. */
export interface EntityClaim {
  disruption: DisruptionSummary;
  exposure: Exposure;
}

export interface EntityProfile {
  entity: Entity;
  /** Open disruptions reaching this entity, worst severity first. */
  claims: EntityClaim[];
  /**
   * Disruptions that reached it and have since resolved. Kept and shown rather
   * than dropped: an assessment quietly disappearing is indistinguishable from
   * one that was wrong, and the register's whole argument is that it can be
   * checked after the fact.
   */
  resolved: EntityClaim[];
  /** Worst severity across the OPEN claims only. Null when there are none. */
  worstSeverity: Severity | null;
  /** The most recent asOf across open claims — this page's honest "as of". */
  lastAssessedAt: string | null;
}

function byWorstFirst(a: EntityClaim, b: EntityClaim): number {
  const bySeverity = SEVERITY_RANK[b.exposure.severity] - SEVERITY_RANK[a.exposure.severity];
  if (bySeverity !== 0) return bySeverity;
  // Then most recently assessed, so the freshest claim leads.
  return b.exposure.asOf.localeCompare(a.exposure.asOf);
}

/**
 * Every entity id the register has ever named, resolved entries included.
 *
 * Resolved ones are deliberately in the list: an entity page is a permanent
 * URL, and a page that 404s the moment its last disruption resolves would
 * break links that already exist. The page says the exposure has resolved
 * instead.
 */
export async function listEntityIds(): Promise<string[]> {
  const ids = new Set<string>();
  for (const disruption of await readFromActiveSource()) {
    for (const exposure of disruption.exposures) ids.add(exposure.entity.id);
  }
  return [...ids].sort();
}

/**
 * Every entity, with its open claims — the index page's payload.
 *
 * Ordered exactly as the chart's rows are (worst severity, then reach, then
 * name), so the two pages agree about which names matter most.
 */
export async function listEntities(): Promise<EntityProfile[]> {
  const all = (await readFromActiveSource()).map(toSummary);
  const ids = new Set<string>();
  for (const disruption of all) {
    for (const exposure of disruption.exposures) ids.add(exposure.entity.id);
  }

  const profiles = [...ids]
    .map((id) => buildProfile(id, all))
    .filter((profile): profile is EntityProfile => profile !== null);

  return profiles.sort(mostExposedFirst((profile) => profile.claims.length));
}

export async function getEntityProfile(id: string): Promise<EntityProfile | null> {
  return buildProfile(id, (await readFromActiveSource()).map(toSummary));
}

function buildProfile(id: string, all: DisruptionSummary[]): EntityProfile | null {
  const claims: EntityClaim[] = [];
  const resolved: EntityClaim[] = [];
  let entity: Entity | null = null;
  let lastSeenAt = '';

  for (const disruption of all) {
    for (const exposure of disruption.exposures) {
      if (exposure.entity.id !== id) continue;
      // The entity record is carried on every exposure. The most recently
      // reviewed disruption wins, so a renamed company or a newly issued
      // ticker is reflected rather than frozen at whichever file sorted first.
      if (!entity || disruption.updatedAt > lastSeenAt) {
        entity = exposure.entity;
        lastSeenAt = disruption.updatedAt;
      }
      (disruption.status === 'resolved' ? resolved : claims).push({ disruption, exposure });
    }
  }

  if (!entity) return null;

  claims.sort(byWorstFirst);
  resolved.sort(byWorstFirst);

  return {
    entity,
    claims,
    resolved,
    worstSeverity: claims.length > 0 ? worstOf(claims.map((claim) => claim.exposure)) : null,
    lastAssessedAt:
      claims.map((claim) => claim.exposure.asOf).sort().at(-1) ?? null,
  };
}
