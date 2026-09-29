/**
 * Development-only register entries, for reviewing the exposure chart before
 * any real assessment exists.
 *
 * Two rules make these safe:
 *
 *   1. Every title, entity and source is prefixed or domained `[SAMPLE]` /
 *      `example.invalid`, so a fixture reaching a screenshot is unmistakable.
 *      Tickers cannot carry a prefix and stay shaped like tickers, so they use
 *      the exchanges' reserved test symbols instead — see ENTITIES below.
 *   2. **Every company here is invented.** Attaching a made-up exposure to a
 *      real, named, listed company would be precisely the harm the whole
 *      strictness of this layer exists to prevent — it would read as a
 *      sourced claim about a real business. So the names are fictional and
 *      obviously so.
 *
 * The module refuses to load in a production build at all.
 */

import type { Disruption } from '../types';

if (process.env.NODE_ENV === 'production' && process.env.CONTENT_SOURCE === 'fixtures') {
  throw new Error(
    'CONTENT_SOURCE=fixtures must never be used for a production build. ' +
      'Fixture disruptions are invented and would publish as if they were real assessments. ' +
      'Set CONTENT_SOURCE=local (or leave it unset).',
  );
}

function source(title: string, publisher: string, slug: string) {
  return {
    title: `[SAMPLE] ${title}`,
    url: `https://example.invalid/${slug}`,
    publisher: `[SAMPLE] ${publisher}`,
    retrievedAt: '2026-09-08',
  };
}

/**
 * Tickers are NASDAQ's reserved test symbols (the `Z**ZT` family), not invented
 * ones. An invented four-letter ticker is not safely fictional the way an
 * invented company name is: the namespace is small, exchanges keep assigning
 * from it, and a plausible-looking string will eventually collide with a real
 * issuer. This set previously used `MDT` and `CLDR` — Medtronic's live NYSE
 * ticker and Cloudera's before it delisted. The `[SAMPLE]` name prefix meant
 * nobody was actually misled, but a file whose entire job is to be
 * unmistakably fake should not carry a real company's identifier at all.
 *
 * These symbols are permanently reserved for testing and are never assigned to
 * an issuer, so the collision cannot come back.
 */
const ENTITIES = {
  northline: {
    id: 'northline-freight',
    name: '[SAMPLE] Northline Freight',
    kind: 'company' as const,
    ticker: 'ZVZZT',
    sector: 'Marine shipping',
  },
  meridian: {
    id: 'meridian-terminals',
    name: '[SAMPLE] Meridian Terminals',
    kind: 'company' as const,
    ticker: 'ZWZZT',
    sector: 'Ports and terminals',
  },
  calder: {
    id: 'calder-industrial',
    name: '[SAMPLE] Calder Industrial',
    kind: 'company' as const,
    ticker: 'ZXZZT',
    sector: 'Industrial manufacturing',
  },
  brightway: {
    id: 'brightway-retail',
    name: '[SAMPLE] Brightway Retail',
    kind: 'company' as const,
    ticker: 'ZAZZT',
    sector: 'General retail',
  },
  orrin: {
    id: 'orrin-chemicals',
    name: '[SAMPLE] Orrin Chemicals',
    kind: 'company' as const,
    ticker: null,
    sector: 'Speciality chemicals',
  },
  autoSector: {
    id: 'sector-automotive',
    name: '[SAMPLE] Automotive assembly',
    kind: 'sector' as const,
    ticker: null,
    sector: 'Automotive',
  },
  applianceSector: {
    id: 'sector-appliances',
    name: '[SAMPLE] Household appliances',
    kind: 'sector' as const,
    ticker: null,
    sector: 'Consumer durables',
  },
};

export const fixtureDisruptions: Disruption[] = [
  {
    id: 'sample-canal-restrictions',
    title: '[SAMPLE] Canal transit restrictions',
    shortLabel: 'CAN',
    status: 'active',
    category: 'chokepoint',
    startedAt: '2026-07-14',
    updatedAt: '2026-09-09',
    summary:
      '[SAMPLE] Placeholder entry describing a chokepoint constraint, used to check the register and the exposure chart. It describes nothing real.',
    author: null,
    places: ['panama'],
    sources: [source('Advisory to shipping', 'Canal authority', 'advisory')],
    exposures: [
      {
        entity: ENTITIES.northline,
        severity: 'high',
        confidence: 'reported',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the operator has stated that a large share of its east–west sailings transit the affected passage, and that rerouting adds materially to voyage length.',
        asOf: '2026-09-09',
        sources: [source('Operator trading statement', 'Northline Freight', 'nlf-statement')],
      },
      {
        entity: ENTITIES.brightway,
        severity: 'moderate',
        confidence: 'inferred',
        mechanism:
          '[SAMPLE] Placeholder mechanism: disclosed sourcing regions and stated lead times imply a meaningful share of inbound volume crosses the affected passage.',
        asOf: '2026-09-07',
        sources: [source('Annual report, sourcing note', 'Brightway Retail', 'bwr-ar')],
      },
      {
        entity: ENTITIES.autoSector,
        severity: 'low',
        confidence: 'estimated',
        mechanism:
          '[SAMPLE] Placeholder mechanism: a judgement from partial information — some assembly inputs are thought to move on the affected routing, but the share is not disclosed.',
        asOf: '2026-09-05',
        sources: [source('Trade body commentary', 'Industry association', 'assoc-note')],
      },
    ],
    contentHtml:
      '<p>[SAMPLE] Placeholder analysis body for a register entry. It exists to check typography, the source list and the exposure section, and states nothing about the world.</p><h2>[SAMPLE] What changed</h2><p>[SAMPLE] A second paragraph, long enough to wrap several times so that the reading measure and paragraph spacing can be judged at something close to real length.</p>',
  },
  {
    id: 'sample-port-congestion',
    title: '[SAMPLE] Gateway port congestion',
    shortLabel: 'PRT',
    status: 'active',
    category: 'port',
    startedAt: '2026-08-02',
    updatedAt: '2026-09-08',
    summary:
      '[SAMPLE] Placeholder entry describing berth queues and inland clearance at a gateway port.',
    author: null,
    places: ['rotterdam', 'antwerp'],
    sources: [source('Weekly terminal statistics', 'Port authority', 'port-stats')],
    exposures: [
      {
        entity: ENTITIES.meridian,
        severity: 'high',
        confidence: 'reported',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the operator runs affected berths and has disclosed extended dwell times at the facility.',
        asOf: '2026-09-08',
        sources: [source('Terminal operations update', 'Meridian Terminals', 'mdt-update')],
      },
      {
        entity: ENTITIES.brightway,
        severity: 'high',
        confidence: 'inferred',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the retailer’s primary import gateway is the affected port, per its disclosed distribution footprint.',
        asOf: '2026-09-06',
        sources: [source('Distribution network filing', 'Brightway Retail', 'bwr-dc')],
      },
      {
        entity: ENTITIES.applianceSector,
        severity: 'moderate',
        confidence: 'estimated',
        mechanism:
          '[SAMPLE] Placeholder mechanism: category import volumes concentrate at this gateway in customs data, though firm-level exposure is not broken out.',
        asOf: '2026-09-04',
        sources: [source('Customs import series', 'Statistics office', 'customs')],
      },
    ],
    contentHtml:
      '<p>[SAMPLE] Placeholder analysis body for the port congestion entry.</p>',
  },
  {
    id: 'sample-export-controls',
    title: '[SAMPLE] Export licensing on a processed input',
    shortLabel: 'EXP',
    status: 'active',
    category: 'policy',
    startedAt: '2026-06-20',
    updatedAt: '2026-09-02',
    summary:
      '[SAMPLE] Placeholder entry describing a licensing requirement on a concentrated processed input.',
    author: null,
    places: ['hsinchu', 'taiwan-strait'],
    sources: [source('Ministry notice', 'Trade ministry', 'notice')],
    exposures: [
      {
        entity: ENTITIES.orrin,
        severity: 'high',
        confidence: 'reported',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the company has disclosed that the controlled input is a principal feedstock and that qualification of alternatives takes several quarters.',
        asOf: '2026-09-02',
        sources: [source('Results call transcript', 'Orrin Chemicals', 'orrin-call')],
      },
      {
        entity: ENTITIES.calder,
        severity: 'moderate',
        confidence: 'inferred',
        mechanism:
          '[SAMPLE] Placeholder mechanism: disclosed product lines require the controlled input, though the company has not quantified its share.',
        asOf: '2026-08-30',
        sources: [source('Product specification sheet', 'Calder Industrial', 'cldr-spec')],
      },
      {
        entity: ENTITIES.autoSector,
        severity: 'moderate',
        confidence: 'estimated',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the input appears in assembly bills of materials across the category, but firm-level intensity is not published.',
        asOf: '2026-08-28',
        sources: [source('Sector input-output note', 'Research institute', 'io-note')],
      },
    ],
    contentHtml: '<p>[SAMPLE] Placeholder analysis body for the export licensing entry.</p>',
  },
  {
    id: 'sample-bunker-costs',
    title: '[SAMPLE] Bunker fuel spread widening',
    shortLabel: 'BNK',
    status: 'easing',
    category: 'energy',
    startedAt: '2026-05-11',
    updatedAt: '2026-09-01',
    summary: '[SAMPLE] Placeholder entry describing a widening spread between marine fuel grades.',
    author: null,
    places: ['singapore-strait', 'singapore'],
    sources: [source('Bunker price assessment', 'Price reporting agency', 'bunker')],
    exposures: [
      {
        entity: ENTITIES.northline,
        severity: 'moderate',
        confidence: 'reported',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the operator has disclosed the fuel grade mix across its fleet and the surcharge formula applied to customers.',
        asOf: '2026-09-01',
        sources: [source('Bunker surcharge schedule', 'Northline Freight', 'nlf-baf')],
      },
      {
        entity: ENTITIES.meridian,
        severity: 'low',
        confidence: 'estimated',
        mechanism:
          '[SAMPLE] Placeholder mechanism: terminal plant and equipment consume the affected grade, but the quantity is not disclosed.',
        asOf: '2026-08-25',
        sources: [source('Sustainability report, fuel note', 'Meridian Terminals', 'mdt-esg')],
      },
    ],
    contentHtml: null,
  },
  {
    id: 'sample-rail-labour',
    title: '[SAMPLE] Inland rail labour dispute',
    shortLabel: 'RAIL',
    status: 'watch',
    category: 'labour',
    startedAt: '2026-08-28',
    updatedAt: '2026-08-29',
    summary:
      '[SAMPLE] Placeholder entry describing a ballot that has not yet produced a stoppage. Included to show the watch state.',
    author: null,
    places: [],
    sources: [source('Union ballot announcement', 'Transport union', 'ballot')],
    exposures: [
      {
        entity: ENTITIES.meridian,
        severity: 'moderate',
        confidence: 'inferred',
        mechanism:
          '[SAMPLE] Placeholder mechanism: the operator’s disclosed inland clearance depends on the affected rail corridor.',
        asOf: '2026-08-29',
        sources: [source('Intermodal network map', 'Meridian Terminals', 'mdt-rail')],
      },
      {
        entity: ENTITIES.calder,
        severity: 'low',
        confidence: 'estimated',
        mechanism:
          '[SAMPLE] Placeholder mechanism: plant locations sit on the corridor, though the share of inbound volume moving by rail is not published.',
        asOf: '2026-08-29',
        sources: [source('Facility list', 'Calder Industrial', 'cldr-sites')],
      },
    ],
    contentHtml: null,
  },
  {
    id: 'sample-resolved-drought',
    title: '[SAMPLE] Seasonal draught restriction lifted',
    shortLabel: 'DRT',
    status: 'resolved',
    category: 'weather',
    startedAt: '2026-02-03',
    updatedAt: '2026-06-30',
    summary:
      '[SAMPLE] Placeholder entry kept in the register after resolution, because the record matters.',
    author: null,
    places: ['panama'],
    sources: [source('Seasonal restriction notice', 'Waterway authority', 'drought')],
    exposures: [
      {
        entity: ENTITIES.northline,
        severity: 'low',
        confidence: 'reported',
        mechanism:
          '[SAMPLE] Placeholder mechanism: loading restrictions applied to a minority of sailings while the limit was in force.',
        asOf: '2026-06-30',
        sources: [source('Service advisory archive', 'Northline Freight', 'nlf-advisory')],
      },
    ],
    contentHtml: null,
  },
];
