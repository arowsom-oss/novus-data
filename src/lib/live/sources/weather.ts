/**
 * Open-Meteo — current wind and gusts at the major container ports.
 *
 * Ranked by the WMO Beaufort scale, which is a published standard. The page
 * deliberately does not say "operations suspended" at any threshold: stoppage
 * rules differ by terminal and by crane, and a claim about a named port's
 * operations needs a source. It reports the wind; the reader knows what a gale
 * does to a crane.
 *
 * NON-COMMERCIAL ONLY on the free API. See ../meta.ts.
 */

import { PORTS } from '../nodes';
import { beaufortFor } from '../types';
import type { PortWind, Reading, WeatherData } from '../types';
import {
  LiveSourceError,
  fetchJson,
  isRecord,
  latestIso,
  num,
  resolveAsOf,
  str,
  type FetchedJson,
} from './http';

export function fetchWeather(): Promise<FetchedJson> {
  const params = new URLSearchParams({
    latitude: PORTS.map((port) => port.lat).join(','),
    longitude: PORTS.map((port) => port.lon).join(','),
    current: 'wind_speed_10m,wind_gusts_10m',
    wind_speed_unit: 'ms',
    timezone: 'GMT',
  });
  return fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, 'weather', {
    label: 'Open-Meteo',
  });
}

/** Open-Meteo writes GMT times without an offset: "2026-09-22T17:45". */
function gmtIso(value: unknown): string | null {
  const text = str(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null;
  const date = new Date(`${text}:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseWeather({ body, served }: FetchedJson): Reading<WeatherData> {
  // One location comes back as an object, several as an array — in request order.
  const locations = Array.isArray(body) ? body : isRecord(body) ? [body] : null;
  if (!locations) throw new LiveSourceError('Open-Meteo returned an unexpected shape.');
  if (locations.length !== PORTS.length) {
    // Matching by position is only safe when every location came back.
    throw new LiveSourceError('Open-Meteo returned a different number of locations than were asked for.');
  }

  const ports: PortWind[] = [];
  locations.forEach((location, index) => {
    const current = isRecord(location) && isRecord(location.current) ? location.current : null;
    const windMs = num(current?.wind_speed_10m);
    const at = gmtIso(current?.time);
    if (windMs === null || !at) return;
    const { force, label } = beaufortFor(windMs);
    ports.push({
      nodeId: PORTS[index].id,
      windMs,
      gustMs: num(current?.wind_gusts_10m),
      beaufort: force,
      beaufortLabel: label,
      at,
    });
  });

  if (ports.length === 0) throw new LiveSourceError('Open-Meteo returned no usable readings.');
  ports.sort((a, b) => b.windMs - a.windMs);

  const time = resolveAsOf(latestIso(ports.map((p) => p.at)), 'latest model interval', served, 'Open-Meteo');
  const missing = PORTS.length - ports.length;

  return {
    status: 'ok',
    source: 'weather',
    asOf: time.asOf,
    asOfBasis: time.asOfBasis,
    data: { ports },
    notes: [
      ...time.notes,
      'Modelled conditions at the nearest grid point, not a reading from the port itself.',
      ...(missing > 0 ? [`${missing} port${missing === 1 ? '' : 's'} returned no usable reading.`] : []),
    ],
  };
}

