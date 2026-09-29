/**
 * NOAA National Hurricane Center — active tropical cyclones.
 *
 * Covers the Atlantic and eastern and central Pacific only. West Pacific
 * typhoons — the ones that close Shanghai, Ningbo and Kaohsiung — are not in
 * this feed; they reach the page through GDACS. The page says so, because an
 * empty NHC panel in August would otherwise read as "no storms anywhere".
 *
 * Only intensity (knots, NHC's unit for maximum sustained wind) and pressure
 * (millibars) are shown. Movement is omitted deliberately: its unit could not
 * be confirmed against a live response, and a speed in the wrong unit is a
 * wrong number.
 */

import { nearestNode } from '../nodes';
import type { NhcData, Reading, Storm } from '../types';
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

const CLASSIFICATIONS: Record<string, string> = {
  TD: 'Tropical depression',
  TS: 'Tropical storm',
  HU: 'Hurricane',
  STD: 'Subtropical depression',
  STS: 'Subtropical storm',
  PTC: 'Post-tropical cyclone',
  PC: 'Potential tropical cyclone',
};

export function fetchNhc(): Promise<FetchedJson> {
  return fetchJson('https://www.nhc.noaa.gov/CurrentStorms.json', 'nhc', { label: 'NHC' });
}

function parseStorm(raw: unknown): Storm | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const lat = num(raw.latitudeNumeric);
  const lon = num(raw.longitudeNumeric);
  const updated = isoFrom(raw.lastUpdate);
  if (!id || lat === null || lon === null || !updated) return null;

  const classification = str(raw.classification) ?? '';
  const advisory = isRecord(raw.publicAdvisory) ? str(raw.publicAdvisory.url) : null;

  return {
    id,
    name: str(raw.name) ?? id.toUpperCase(),
    classification,
    classificationLabel: CLASSIFICATIONS[classification] ?? (classification || 'Tropical system'),
    intensityKt: num(raw.intensity),
    pressureMb: num(raw.pressure),
    lat,
    lon,
    updated,
    advisoryUrl: advisory,
    nearest: nearestNode(lat, lon),
  };
}

export function parseNhc({ body, served }: FetchedJson): Reading<NhcData> {
  if (!isRecord(body)) throw new LiveSourceError('NHC returned an unexpected shape.');

  const storms = asArray(body.activeStorms)
    .map(parseStorm)
    .filter((storm): storm is Storm => storm !== null)
    .sort((a, b) => (b.intensityKt ?? 0) - (a.intensityKt ?? 0));

  const time = resolveAsOf(latestIso(storms.map((s) => s.updated)), 'latest advisory in feed', served, 'NHC');

  return {
    status: 'ok',
    source: 'nhc',
    asOf: time.asOf,
    asOfBasis: time.asOfBasis,
    data: { storms },
    notes: [
      ...time.notes,
      'Atlantic and eastern Pacific only. West Pacific typhoons appear under GDACS alerts.',
    ],
  };
}
