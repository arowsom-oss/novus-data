/**
 * NASA EONET — open natural events, filtered to those near a trade node.
 *
 * EONET carries hundreds of open events at any time, most of them wildfires
 * far from anything this site tracks. Unfiltered, that is noise; so the page
 * shows the total and lists only events within PROXIMITY_KM of a trade node.
 * Polygon geometries are skipped rather than reduced to an invented centre.
 */

import { PROXIMITY_KM } from '../types';
import { nearestNode } from '../nodes';
import type { EonetData, NaturalEvent, Reading } from '../types';
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

const MAX_LISTED = 15;

export function fetchEonet(): Promise<FetchedJson> {
  return fetchJson('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14', 'eonet', {
    label: 'NASA EONET',
  });
}

function parseEvent(raw: unknown): NaturalEvent | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const title = str(raw.title);
  if (!id || !title) return null;

  // The most recent point geometry is where the event is now.
  const points = asArray(raw.geometry)
    .filter(isRecord)
    .filter((g) => str(g.type) === 'Point')
    .map((g) => {
      const coordinates = asArray(g.coordinates);
      return { at: isoFrom(g.date), lon: num(coordinates[0]), lat: num(coordinates[1]) };
    })
    .filter((g) => g.at && g.lat !== null && g.lon !== null)
    .sort((a, b) => Date.parse(b.at!) - Date.parse(a.at!));

  const latest = points[0];
  if (!latest) return null;

  const categories = asArray(raw.categories).filter(isRecord);
  const sources = asArray(raw.sources).filter(isRecord);

  return {
    id,
    title,
    category: str(categories[0]?.title) ?? 'Natural event',
    at: latest.at!,
    lat: latest.lat!,
    lon: latest.lon!,
    url: str(sources[0]?.url) ?? str(raw.link),
    nearest: nearestNode(latest.lat!, latest.lon!),
  };
}

export function parseEonet({ body, served }: FetchedJson): Reading<EonetData> {
  if (!isRecord(body)) throw new LiveSourceError('NASA EONET returned an unexpected shape.');

  const rawEvents = asArray(body.events);
  const events = rawEvents
    .map(parseEvent)
    .filter((event): event is NaturalEvent => event !== null);

  const near = events
    .filter((event) => event.nearest !== null && event.nearest.km <= PROXIMITY_KM)
    .sort((a, b) => (a.nearest?.km ?? 0) - (b.nearest?.km ?? 0))
    .slice(0, MAX_LISTED);

  const time = resolveAsOf(latestIso(events.map((e) => e.at)), 'latest event update in feed', served, 'NASA EONET');
  const skipped = rawEvents.length - events.length;

  return {
    status: 'ok',
    source: 'eonet',
    asOf: time.asOf,
    asOfBasis: time.asOfBasis,
    data: { totalOpen: rawEvents.length, nearTradeNodes: near },
    notes: [
      ...time.notes,
      ...(skipped > 0
        ? [`${skipped} event${skipped === 1 ? '' : 's'} described only by an area rather than a point ${skipped === 1 ? 'was' : 'were'} left out rather than given an estimated centre.`]
        : []),
    ],
  };
}
