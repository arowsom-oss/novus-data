/**
 * GDACS — Orange and Red disaster alerts worldwide, past fourteen days.
 *
 * GDACS is the European Commission and UN coordination feed, and its alert
 * level is its own published assessment of humanitarian impact. The page shows
 * GDACS's level in GDACS's words; it never re-grades an alert or turns one into
 * a claim about trade. Green alerts are excluded because on a global feed they
 * are dominated by events with no bearing on physical trade.
 *
 * This is the least certain adapter in the layer: the event-list endpoint's
 * field names could not be checked against a live response when it was
 * written (the build environment's egress policy blocks gdacs.org). Every
 * field is therefore read with a fallback, an alert missing its essentials is
 * dropped rather than guessed, and `npm run live:check` exists to confirm the
 * shape against the real feed.
 */

import { nearestNode } from '../nodes';
import type { GdacsData, GdacsLevel, HazardAlert, Reading } from '../types';
import {
  LiveSourceError,
  asArray,
  fetchJson,
  isRecord,
  isoFrom,
  latestIso,
  num,
  resolveAsOf,
  str,
  type FetchedJson,
} from './http';

const LEVELS: readonly GdacsLevel[] = ['Orange', 'Red'];
const LOOKBACK_DAYS = 14;

const TYPE_LABELS: Record<string, string> = {
  EQ: 'Earthquake',
  TC: 'Tropical cyclone',
  FL: 'Flood',
  VO: 'Volcano',
  DR: 'Drought',
  WF: 'Wildfire',
  TS: 'Tsunami',
};

function day(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function fetchGdacs(): Promise<FetchedJson> {
  const params = new URLSearchParams({
    eventlist: 'EQ;TC;FL;VO;DR;WF',
    alertlevel: LEVELS.join(';'),
    fromdate: day(-LOOKBACK_DAYS),
    todate: day(0),
  });
  return fetchJson(
    `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${params}`,
    'gdacs',
    { label: 'GDACS' },
  );
}

function parseAlert(feature: unknown): HazardAlert | null {
  if (!isRecord(feature)) return null;
  const p = isRecord(feature.properties) ? feature.properties : null;
  if (!p) return null;

  const type = str(p.eventtype);
  const eventId = str(p.eventid) ?? (num(p.eventid) !== null ? String(num(p.eventid)) : null);
  const level = str(p.alertlevel);
  if (!type || !eventId || !level) return null;

  // Normalise capitalisation; drop anything below the levels asked for.
  const normalisedLevel = LEVELS.find((known) => known.toLowerCase() === level.toLowerCase());
  if (!normalisedLevel) return null;

  const coordinates = asArray(isRecord(feature.geometry) ? feature.geometry.coordinates : null);
  const lon = num(coordinates[0]);
  const lat = num(coordinates[1]);
  const urls = isRecord(p.url) ? p.url : {};

  return {
    id: `${type}-${eventId}`,
    type,
    typeLabel: TYPE_LABELS[type] ?? type,
    name: str(p.name) ?? str(p.eventname) ?? str(p.description) ?? `${TYPE_LABELS[type] ?? type} ${eventId}`,
    level: normalisedLevel,
    country: str(p.country),
    from: isoFrom(p.fromdate),
    to: isoFrom(p.todate),
    updated: isoFrom(p.datemodified),
    url: str(urls.report) ?? str(urls.details) ?? null,
    lat,
    lon,
    nearest: lat !== null && lon !== null ? nearestNode(lat, lon) : null,
  };
}

export function parseGdacs({ body, served }: FetchedJson): Reading<GdacsData> {
  if (!isRecord(body)) throw new LiveSourceError('GDACS returned an unexpected shape.');

  // One event is published as several episodes; keep the most recently updated.
  const byId = new Map<string, HazardAlert>();
  for (const alert of asArray(body.features).map(parseAlert)) {
    if (!alert) continue;
    const held = byId.get(alert.id);
    if (!held || Date.parse(alert.updated ?? '') > Date.parse(held.updated ?? '')) {
      byId.set(alert.id, alert);
    }
  }

  const alerts = [...byId.values()].sort((a, b) => {
    if (a.level !== b.level) return a.level === 'Red' ? -1 : 1;
    return Date.parse(b.updated ?? b.from ?? '') - Date.parse(a.updated ?? a.from ?? '');
  });

  const time = resolveAsOf(
    latestIso(alerts.map((a) => a.updated ?? a.from)),
    'latest alert update in feed',
    served,
    'GDACS',
  );

  return {
    status: 'ok',
    source: 'gdacs',
    asOf: time.asOf,
    asOfBasis: time.asOfBasis,
    data: { levels: LEVELS, alerts },
    notes: time.notes,
  };
}
