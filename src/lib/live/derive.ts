/**
 * Two things built from readings the site already has: flags and the place
 * board. Pure — no network, no clock of its own — so the page, /live.json and
 * any future client compute exactly the same result from the same snapshot.
 *
 * ---------------------------------------------------------------------------
 * FLAGS ARE RULES, NOT JUDGEMENTS
 *
 * A flag says "this published rule fired on this reading". Every rule is in
 * FLAG_RULES, in words, and the page prints them. Nothing here weighs
 * readings against each other, blends them into a score, or says what a
 * reading means for any company — that is the register's job, done by a
 * person, with sources (§6a). A flag is a reason to look, not a finding.
 *
 * Each flag's `id` is stable for as long as its condition holds (the same
 * quake, the same port, the same place), so a watcher diffing /live.json can
 * tell a new flag from one it has already seen — the same state-not-events
 * design as /register.json (§6c).
 * ---------------------------------------------------------------------------
 */

import { ALL_NODES, distanceKm, nodeById } from './nodes';
import {
  PROXIMITY_KM,
  REPORTING_RULES,
  type LiveFlag,
  type LiveSnapshot,
  type PlaceSummary,
  type PriceSeries,
} from './types';

export const FLAG_THRESHOLDS = {
  quakeMagnitude: 6,
  galeBeaufort: 8,
  nearGaleBeaufort: 7,
  oilDailyMovePct: 5,
  maxHotspotFlags: 5,
} as const;

/**
 * The rules, in the words the page prints, keyed by the prefix of the flag ids
 * they produce. Each flag looks its rule up by that key, so the printed order
 * can change without attaching the wrong rule to a flag.
 */
const RULE_TEXT = {
  reporting: `Conflict reporting geocoded near a tracked place — within ${REPORTING_RULES.portRadiusKm} km of a port or industrial cluster or ${REPORTING_RULES.chokepointRadiusKm} km of a chokepoint, or the place's own narrower radius where a large unrelated city would otherwise fall inside (each is on the place board), each story counted for the nearest place only — is at least ${REPORTING_RULES.surgingRatio}× its normal share (alert) or ${REPORTING_RULES.elevatedRatio}× (watch), with at least ${REPORTING_RULES.placeMinReports} reports across ${REPORTING_RULES.minEvents} or more events. A place with no measurable normal is at most a watch.`,
  hotspot: `A city anywhere with a measurable normal is reporting at least ${REPORTING_RULES.hotspotMinRatio}× its normal share with at least ${REPORTING_RULES.hotspotMinReports} reports across ${REPORTING_RULES.minEvents} or more events (watch; the ${FLAG_THRESHOLDS.maxHotspotFlags} largest).`,
  quake: `An earthquake of magnitude ${FLAG_THRESHOLDS.quakeMagnitude.toFixed(1)} or more within ${PROXIMITY_KM} km of a tracked place, or any with a USGS PAGER alert of orange or red (alert).`,
  gdacs: `A GDACS red alert anywhere (alert), or an orange alert within ${PROXIMITY_KM} km of a tracked place (watch).`,
  storm: `An active tropical cyclone within ${PROXIMITY_KM} km of a tracked place (alert).`,
  wind: `Mean wind at a tracked port of Beaufort ${FLAG_THRESHOLDS.galeBeaufort}, gale, or above (alert), or Beaufort ${FLAG_THRESHOLDS.nearGaleBeaufort} (watch).`,
  event: `A wildfire, volcano or other open natural event within ${PROXIMITY_KM} km of a tracked place (watch).`,
  price: `Brent or WTI crude moved ${FLAG_THRESHOLDS.oilDailyMovePct}% or more between its last two daily observations (watch).`,
} as const;

export const FLAG_RULES: Array<{ id: string; text: string }> = Object.entries(RULE_TEXT).map(([id, text]) => ({
  id,
  text,
}));

function placeName(id: string | null | undefined): string {
  return (id && nodeById(id)?.name) || 'a tracked place';
}

function within(lat: number | null, lon: number | null, nodeLat: number, nodeLon: number): boolean {
  if (lat === null || lon === null) return false;
  return distanceKm(lat, lon, nodeLat, nodeLon) <= PROXIMITY_KM;
}

/** Tracked places within range of a point, nearest first. */
function placesNear(lat: number | null, lon: number | null): string[] {
  if (lat === null || lon === null) return [];
  return ALL_NODES.map((node) => ({ id: node.id, km: distanceKm(lat, lon, node.lat, node.lon) }))
    .filter((p) => p.km <= PROXIMITY_KM)
    .sort((a, b) => a.km - b.km)
    .map((p) => p.id);
}

function dailyMove(series: PriceSeries): { pct: number; from: string; to: string } | null {
  const [previous, latest] = series.points.slice(-2);
  if (!previous || !latest || previous.value === 0) return null;
  return { pct: (latest.value / previous.value - 1) * 100, from: previous.date, to: latest.date };
}

/** "3.4× the normal share", or — when normal was below the floor — what normal actually was. */
function againstNormal(c: { ratio: number; floored: boolean }): string {
  return c.floored
    ? `where fewer than ${REPORTING_RULES.minExpected} would be normal`
    : `${c.ratio.toFixed(1)}× the normal share`;
}

export function deriveFlags(snapshot: LiveSnapshot): LiveFlag[] {
  const flags: LiveFlag[] = [];

  const { gdelt, usgs, gdacs, nhc, eonet, weather, fred } = snapshot;

  if (gdelt.status === 'ok') {
    for (const place of gdelt.data.places) {
      if (place.level === 'normal') continue;
      flags.push({
        id: `reporting:${place.nodeId}`,
        level: place.level === 'surging' ? 'alert' : 'watch',
        title: `Conflict reporting ${place.level === 'surging' ? 'surging' : 'elevated'} near ${placeName(place.nodeId)}`,
        detail: `${Math.round(place.reports)} reports in the last three hours, ${againstNormal(place)} for this time of day.`,
        rule: RULE_TEXT.reporting,
        source: 'gdelt',
        at: gdelt.asOf,
        placeId: place.nodeId,
        href: null,
      });
    }
    for (const spot of gdelt.data.hotspots.slice(0, FLAG_THRESHOLDS.maxHotspotFlags)) {
      flags.push({
        id: `hotspot:${spot.key}`,
        level: 'watch',
        title: `Unusual reporting: ${spot.name}`,
        detail: `${Math.round(spot.reports)} conflict reports across ${spot.events} events in three hours, ${againstNormal(spot)}.${
          spot.nearest ? ` Nearest tracked place: ${spot.nearest.nodeName}, ${spot.nearest.km} km.` : ''
        }`,
        rule: RULE_TEXT.hotspot,
        source: 'gdelt',
        at: gdelt.asOf,
        placeId: spot.nearest && spot.nearest.km <= PROXIMITY_KM ? spot.nearest.nodeId : null,
        href: spot.sources[0]?.url ?? null,
      });
    }
  }

  if (usgs.status === 'ok') {
    for (const quake of usgs.data.quakes) {
      const near = placesNear(quake.lat, quake.lon);
      const serious = quake.pagerAlert === 'orange' || quake.pagerAlert === 'red';
      if (!serious && !(quake.magnitude >= FLAG_THRESHOLDS.quakeMagnitude && near.length > 0)) continue;
      flags.push({
        id: `quake:${quake.id}`,
        level: 'alert',
        title: `M${quake.magnitude.toFixed(1)} earthquake${near.length > 0 ? ` near ${placeName(near[0])}` : ''}`,
        detail: `${quake.place}.${quake.pagerAlert ? ` USGS PAGER alert: ${quake.pagerAlert}.` : ''}`,
        rule: RULE_TEXT.quake,
        source: 'usgs',
        at: quake.at,
        placeId: near[0] ?? null,
        href: quake.url,
      });
    }
  }

  if (gdacs.status === 'ok') {
    for (const alert of gdacs.data.alerts) {
      const near = placesNear(alert.lat, alert.lon);
      const red = alert.level === 'Red';
      if (!red && near.length === 0) continue;
      flags.push({
        id: `gdacs:${alert.id}`,
        level: red ? 'alert' : 'watch',
        title: `${alert.level} alert: ${alert.name}`,
        detail: `${alert.typeLabel}${alert.country ? `, ${alert.country}` : ''}.${
          near.length > 0 ? ` Within ${PROXIMITY_KM} km of ${placeName(near[0])}.` : ''
        }`,
        rule: RULE_TEXT.gdacs,
        source: 'gdacs',
        at: alert.updated ?? alert.from ?? gdacs.asOf,
        placeId: near[0] ?? null,
        href: alert.url,
      });
    }
  }

  if (nhc.status === 'ok') {
    for (const storm of nhc.data.storms) {
      const near = placesNear(storm.lat, storm.lon);
      if (near.length === 0) continue;
      flags.push({
        id: `storm:${storm.id}`,
        level: 'alert',
        title: `${storm.classificationLabel} ${storm.name} near ${placeName(near[0])}`,
        detail: `${storm.intensityKt !== null ? `${storm.intensityKt} kt winds. ` : ''}Position from the latest advisory.`,
        rule: RULE_TEXT.storm,
        source: 'nhc',
        at: storm.updated,
        placeId: near[0],
        href: storm.advisoryUrl,
      });
    }
  }

  if (weather.status === 'ok') {
    for (const port of weather.data.ports) {
      if (port.beaufort < FLAG_THRESHOLDS.nearGaleBeaufort) continue;
      flags.push({
        id: `wind:${port.nodeId}`,
        level: port.beaufort >= FLAG_THRESHOLDS.galeBeaufort ? 'alert' : 'watch',
        title: `${port.beaufortLabel} at ${placeName(port.nodeId)}`,
        detail: `Mean wind ${port.windMs.toFixed(1)} m/s${port.gustMs !== null ? `, gusts ${port.gustMs.toFixed(1)} m/s` : ''} — Beaufort ${port.beaufort}.`,
        rule: RULE_TEXT.wind,
        source: 'weather',
        at: port.at,
        placeId: port.nodeId,
        href: null,
      });
    }
  }

  if (eonet.status === 'ok') {
    for (const event of eonet.data.nearTradeNodes) {
      if (!event.nearest || event.nearest.km > PROXIMITY_KM) continue;
      flags.push({
        id: `event:${event.id}`,
        level: 'watch',
        title: `${event.category}: ${event.title}`,
        detail: `${event.nearest.km} km from ${event.nearest.nodeName}.`,
        rule: RULE_TEXT.event,
        source: 'eonet',
        at: event.at,
        placeId: event.nearest.nodeId,
        href: event.url,
      });
    }
  }

  if (fred.status === 'ok') {
    for (const series of fred.data.series) {
      if (series.id !== 'DCOILBRENTEU' && series.id !== 'DCOILWTICO') continue;
      const move = dailyMove(series);
      if (!move || Math.abs(move.pct) < FLAG_THRESHOLDS.oilDailyMovePct) continue;
      flags.push({
        id: `price:${series.id}:${move.to}`,
        level: 'watch',
        title: `${series.label} ${move.pct > 0 ? 'up' : 'down'} ${Math.abs(move.pct).toFixed(1)}%`,
        detail: `From ${move.from} to ${move.to}, per the ${series.origin}.`,
        rule: RULE_TEXT.price,
        source: 'fred',
        at: `${move.to}T00:00:00.000Z`,
        placeId: null,
        href: series.sourceUrl,
      });
    }
  }

  return flags.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'alert' ? -1 : 1;
    return Date.parse(b.at) - Date.parse(a.at);
  });
}

export function derivePlaces(snapshot: LiveSnapshot, flags: LiveFlag[]): PlaceSummary[] {
  const { gdelt, usgs, gdacs, nhc, eonet, weather, ais } = snapshot;

  return ALL_NODES.map((node) => {
    const quakes =
      usgs.status === 'ok' ? usgs.data.quakes.filter((q) => within(q.lat, q.lon, node.lat, node.lon)) : [];
    const alerts =
      gdacs.status === 'ok' ? gdacs.data.alerts.filter((a) => within(a.lat, a.lon, node.lat, node.lon)) : [];
    const storms =
      nhc.status === 'ok' ? nhc.data.storms.filter((s) => within(s.lat, s.lon, node.lat, node.lon)) : [];
    const events =
      eonet.status === 'ok' ? eonet.data.nearTradeNodes.filter((e) => within(e.lat, e.lon, node.lat, node.lon)) : [];
    const port = weather.status === 'ok' ? weather.data.ports.find((p) => p.nodeId === node.id) : undefined;
    const sample = ais.status === 'ok' ? ais.data.chokepoints.find((c) => c.nodeId === node.id) : undefined;

    const worst = alerts.length === 0 ? null : alerts.some((a) => a.level === 'Red') ? 'Red' : 'Orange';

    return {
      nodeId: node.id,
      reporting: gdelt.status === 'ok' ? (gdelt.data.places.find((p) => p.nodeId === node.id) ?? null) : null,
      quakes: {
        count: quakes.length,
        maxMagnitude: quakes.length > 0 ? Math.max(...quakes.map((q) => q.magnitude)) : null,
      },
      alerts: { count: alerts.length, worst },
      storms: {
        count: storms.length,
        nearestKm:
          storms.length > 0 ? Math.round(Math.min(...storms.map((s) => distanceKm(s.lat, s.lon, node.lat, node.lon)))) : null,
      },
      events: events.length,
      wind: port ? { windMs: port.windMs, beaufort: port.beaufort, label: port.beaufortLabel } : null,
      // A box with no messages is "no signal", which the board shows as a
      // dash, never as zero vessels.
      vessels: sample && sample.messages > 0 ? { underway: sample.vesselsUnderway, heard: sample.vesselsObserved } : null,
      flags: flags.filter((f) => f.placeId === node.id).length,
    };
  });
}
