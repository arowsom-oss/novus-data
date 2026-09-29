/**
 * Trade nodes: the chokepoints, ports and industrial clusters that hazards and
 * vessel counts are measured against.
 *
 * Pure data and pure geometry, so it is safe anywhere, including the client.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE COORDINATES ARE, AND WHAT THEY ARE NOT
 *
 * Approximate centres and hand-drawn sampling boxes, accurate to a few
 * kilometres — ample for a 300 km proximity radius and for bucketing vessel
 * positions, and not survey-grade for anything else.
 *
 * Every node is named by PLACE, never by company. "180 km from Hsinchu
 * Science Park" is a statement of geography. "180 km from <a chipmaker>" would
 * read as a claim that the company is exposed, and on this site an exposure
 * claim about a named company needs a mechanism, a confidence, a date and a
 * source (§6a) — which is what the register is for. The live layer measures
 * distance; the register makes claims. Keep them apart.
 * ---------------------------------------------------------------------------
 */

import { REPORTING_RULES, type NearestNode, type TradeNode } from './types';

export const CHOKEPOINTS: TradeNode[] = [
  {
    id: 'suez',
    name: 'Suez Canal',
    kind: 'chokepoint',
    lat: 30.6,
    lon: 32.4,
    box: [[29.85, 32.25], [31.35, 32.65]],
    reporting: {
      km: 90,
      why: 'Port Said, Ismailia and Suez are in; Cairo, 128 km away, is not — Egypt’s capital would outweigh the canal.',
    },
  },
  {
    id: 'bab-el-mandeb',
    name: 'Bab el-Mandeb',
    kind: 'chokepoint',
    lat: 12.65,
    lon: 43.4,
    box: [[12.3, 43.1], [13.0, 43.7]],
  },
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    kind: 'chokepoint',
    lat: 26.55,
    lon: 56.4,
    box: [[25.9, 55.8], [27.0, 57.2]],
    reporting: {
      km: 170,
      why: 'Bandar Abbas and the Fujairah anchorage are in; Dubai, 188 km away, counts toward Jebel Ali instead.',
    },
  },
  {
    id: 'singapore-strait',
    name: 'Singapore Strait (Malacca, east end)',
    kind: 'chokepoint',
    lat: 1.25,
    lon: 103.95,
    box: [[1.05, 103.55], [1.45, 104.45]],
  },
  {
    id: 'taiwan-strait',
    name: 'Taiwan Strait',
    kind: 'chokepoint',
    lat: 24.3,
    lon: 119.8,
    box: [[23.5, 119.0], [25.2, 120.6]],
    note: 'A wide strait; much of it sits beyond terrestrial receiver range.',
    // The default radius, stated so the choice is visible: Taipei sits at
    // 195 km, just inside, and is kept rather than cut.
    reporting: {
      km: 200,
      why: 'The default, kept on purpose: Taipei, at 195 km, stays in because Taiwan’s defence ministry reports activity in the strait from there.',
    },
  },
  {
    id: 'panama',
    name: 'Panama Canal',
    kind: 'chokepoint',
    lat: 9.15,
    lon: -79.75,
    box: [[8.85, -80.05], [9.45, -79.45]],
  },
  {
    id: 'bosphorus',
    name: 'Bosphorus',
    kind: 'chokepoint',
    lat: 41.1,
    lon: 29.07,
    box: [[40.95, 28.95], [41.25, 29.2]],
  },
  {
    id: 'gibraltar',
    name: 'Strait of Gibraltar',
    kind: 'chokepoint',
    lat: 35.98,
    lon: -5.55,
    box: [[35.85, -5.85], [36.15, -5.25]],
  },
  {
    id: 'dover',
    name: 'Strait of Dover',
    kind: 'chokepoint',
    lat: 51.02,
    lon: 1.5,
    box: [[50.85, 1.15], [51.2, 1.85]],
    reporting: {
      km: 65,
      why: 'Dover, Folkestone, Calais, Boulogne and Dunkirk are in; London (126 km) and Lille (118 km) are not.',
    },
  },
  {
    id: 'cape-of-good-hope',
    name: 'Cape of Good Hope',
    kind: 'chokepoint',
    lat: -34.5,
    lon: 18.5,
    box: [[-35.2, 17.8], [-33.8, 19.2]],
    note: 'The Red Sea diversion route. Traffic passes offshore, where receiver coverage is thin.',
  },
];

export const PORTS: TradeNode[] = [
  { id: 'shanghai', name: 'Port of Shanghai (Yangshan)', kind: 'port', lat: 30.63, lon: 122.07 },
  { id: 'singapore', name: 'Port of Singapore', kind: 'port', lat: 1.26, lon: 103.84 },
  { id: 'ningbo', name: 'Port of Ningbo-Zhoushan', kind: 'port', lat: 29.93, lon: 121.87 },
  { id: 'busan', name: 'Port of Busan', kind: 'port', lat: 35.1, lon: 129.04 },
  { id: 'kaohsiung', name: 'Port of Kaohsiung', kind: 'port', lat: 22.6, lon: 120.28 },
  {
    id: 'jebel-ali',
    name: 'Jebel Ali',
    kind: 'port',
    lat: 25.01,
    lon: 55.06,
    reporting: { km: 60, why: 'Dubai is in; Abu Dhabi, the UAE’s capital, 93 km away, is not.' },
  },
  {
    id: 'rotterdam',
    name: 'Port of Rotterdam',
    kind: 'port',
    lat: 51.95,
    lon: 4.05,
    reporting: {
      km: 45,
      exclude: ['The Hague', 'Den Haag', "'s-Gravenhage"],
      why: 'Rotterdam and the Maas towns are in; Amsterdam (74 km) is not, and The Hague (22 km) is excluded by name — its reporting is about the international courts that sit there.',
    },
  },
  {
    id: 'antwerp',
    name: 'Port of Antwerp-Bruges',
    kind: 'port',
    lat: 51.28,
    lon: 4.33,
    reporting: {
      km: 100,
      exclude: ['Brussels', 'Bruxelles', 'Brussel'],
      why: 'Antwerp, Ghent and Zeebrugge are in; Brussels (48 km) is excluded by name — its reporting is about the EU and the Belgian government.',
    },
  },
  {
    id: 'hamburg',
    name: 'Port of Hamburg',
    kind: 'port',
    lat: 53.54,
    lon: 9.93,
    reporting: { km: 60, why: 'Hamburg is in; Bremen, 91 km away, is not.' },
  },
  {
    id: 'la-long-beach',
    name: 'Los Angeles / Long Beach',
    kind: 'port',
    lat: 33.74,
    lon: -118.23,
    reporting: {
      km: 25,
      why: 'Long Beach, San Pedro and Wilmington are in; downtown Los Angeles, 34 km away, is not — the city’s news is not the ports’.',
    },
  },
  { id: 'houston', name: 'Port of Houston', kind: 'port', lat: 29.73, lon: -95.02 },
  {
    id: 'santos',
    name: 'Port of Santos',
    kind: 'port',
    lat: -23.97,
    lon: -46.3,
    reporting: { km: 40, why: 'Santos and Guarujá are in; São Paulo, 58 km away, is not.' },
  },
];

export const INDUSTRIAL: TradeNode[] = [
  {
    id: 'hsinchu',
    name: 'Hsinchu Science Park',
    kind: 'industrial',
    lat: 24.78,
    lon: 121.0,
    reporting: { km: 40, why: 'Hsinchu is in; Taipei (63 km) and Taichung (78 km) are not.' },
  },
  {
    id: 'kumamoto',
    name: 'Kikuyo, Kumamoto (semiconductor cluster)',
    kind: 'industrial',
    lat: 32.88,
    lon: 130.83,
    reporting: { km: 50, why: 'Kumamoto is in; Fukuoka, 88 km away, is not.' },
  },
  {
    id: 'pyeongtaek',
    name: 'Pyeongtaek (semiconductor cluster)',
    kind: 'industrial',
    lat: 37.02,
    lon: 127.05,
    reporting: { km: 45, why: 'Pyeongtaek, Suwon and Hwaseong are in; Seoul (61 km) and Incheon (58 km) are not.' },
  },
];

export const ALL_NODES: TradeNode[] = [...CHOKEPOINTS, ...PORTS, ...INDUSTRIAL];

const NODE_BY_ID = new Map(ALL_NODES.map((node) => [node.id, node]));

/**
 * How far from a place conflict reporting counts toward it: the place's own
 * radius where it sets one, otherwise the default for its kind.
 */
export function reportingRadiusKm(node: TradeNode): number {
  if (node.reporting) return node.reporting.km;
  return node.kind === 'chokepoint' ? REPORTING_RULES.chokepointRadiusKm : REPORTING_RULES.portRadiusKm;
}

/** Whether a place GDELT geocoded to is excluded by name from this node's count. */
export function excludedFromReporting(node: TradeNode, geocodedName: string): boolean {
  const name = geocodedName.toLowerCase();
  return (node.reporting?.exclude ?? []).some((prefix) => {
    const p = prefix.toLowerCase();
    return name === p || name.startsWith(`${p},`);
  });
}

export function nodeById(id: string): TradeNode | undefined {
  return NODE_BY_ID.get(id);
}

/** Great-circle distance in km. Haversine; ample at these distances. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The closest trade node to a point, whatever its distance. The page decides what "near" means. */
export function nearestNode(lat: number, lon: number): NearestNode | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best: NearestNode | null = null;
  for (const node of ALL_NODES) {
    const km = distanceKm(lat, lon, node.lat, node.lon);
    if (!best || km < best.km) best = { nodeId: node.id, nodeName: node.name, km: Math.round(km) };
  }
  return best;
}

/** Which chokepoint box, if any, contains a position. */
export function chokepointContaining(lat: number, lon: number): TradeNode | undefined {
  return CHOKEPOINTS.find((node) => {
    if (!node.box) return false;
    const [[south, west], [north, east]] = node.box;
    return lat >= south && lat <= north && lon >= west && lon <= east;
  });
}
