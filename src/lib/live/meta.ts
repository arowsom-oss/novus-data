/**
 * What is known about each live source before any data is fetched.
 *
 * Pure data, safe anywhere. The page's source panel and its attribution block
 * both read from here, so a source cannot appear on the page without its
 * terms beside it.
 *
 * ---------------------------------------------------------------------------
 * ON THE `terms` LINES
 *
 * Each says exactly how far the terms were verified, because every source here
 * is republished and the terms genuinely matter — in particular for a
 * publication that intends to charge. Two were checked against the publisher's
 * own statements at build time and carry obligations that bite:
 *
 *   - Open-Meteo's free API is NON-COMMERCIAL ONLY. Its terms count a site
 *     with subscriptions or advertising as commercial. The day Novus Data
 *     monetises, this source needs a paid plan or has to go.
 *   - GDELT permits commercial use but requires a citation and a link to
 *     gdeltproject.org wherever the data is used or redistributed.
 *
 * Stock quotes are the third, and the strictest: see the quotes entry. The
 * rest are marked "not verified" rather than given a plausible-sounding
 * licence. An invented terms line is worse than an honest gap.
 *
 * Freshness windows and date precision are in ./clocks.ts.
 * ---------------------------------------------------------------------------
 */

import { SOURCE_CLOCKS } from './clocks';
import type { LiveSourceId, SourceMeta } from './types';

export const SOURCE_META: Record<LiveSourceId, SourceMeta> = {
  ais: {
    id: 'ais',
    name: 'AISStream',
    publisher: 'AISStream.io',
    measures: 'Vessels heard at ten chokepoints',
    homepage: 'https://aisstream.io/',
    cadence: 'Continuous vessel broadcasts; sampled here for 30 seconds every fifteen minutes',
    terms:
      'Free with a registered API key; must be read from a server, never a browser (AISStream documentation). Full terms not verified in this build — read them before commercial use.',
    ...SOURCE_CLOCKS.ais,
    requiresEnv: 'AISSTREAM_API_KEY',
  },
  gdelt: {
    id: 'gdelt',
    name: 'GDELT Event Database 2.0',
    publisher: 'The GDELT Project',
    measures: 'Where conflict reporting is rising above its own normal',
    homepage: 'https://www.gdeltproject.org/',
    cadence: 'A new event file every fifteen minutes',
    terms:
      'Free and open, commercial use permitted, provided every use cites the GDELT Project with a link to gdeltproject.org (GDELT data page).',
    ...SOURCE_CLOCKS.gdelt,
    requiresEnv: null,
  },
  usgs: {
    id: 'usgs',
    name: 'Earthquake Hazards Program feeds',
    publisher: 'U.S. Geological Survey',
    measures: 'Earthquakes, magnitude 4.5 and above',
    homepage: 'https://earthquake.usgs.gov/earthquakes/feed/',
    cadence: 'Feed regenerated every minute',
    terms: 'U.S. federal government data. Terms not re-verified in this build.',
    ...SOURCE_CLOCKS.usgs,
    requiresEnv: null,
  },
  gdacs: {
    id: 'gdacs',
    name: 'Global Disaster Alert and Coordination System',
    publisher: 'European Commission JRC and UN OCHA',
    measures: 'Orange and red disaster alerts',
    homepage: 'https://www.gdacs.org/',
    cadence: 'Alerts issued and updated as events develop',
    terms: 'Terms not verified in this build — check before republishing.',
    ...SOURCE_CLOCKS.gdacs,
    requiresEnv: null,
  },
  nhc: {
    id: 'nhc',
    name: 'Active tropical cyclones',
    publisher: 'NOAA National Hurricane Center',
    measures: 'Hurricanes and tropical storms, Atlantic and eastern Pacific',
    homepage: 'https://www.nhc.noaa.gov/',
    cadence: 'Advisories every three to six hours per storm (Atlantic and eastern Pacific)',
    terms: 'U.S. federal government data. Terms not re-verified in this build.',
    ...SOURCE_CLOCKS.nhc,
    requiresEnv: null,
  },
  eonet: {
    id: 'eonet',
    name: 'Earth Observatory Natural Event Tracker',
    publisher: 'NASA',
    measures: 'Open natural events near trade routes',
    homepage: 'https://eonet.gsfc.nasa.gov/',
    cadence: 'Curated from upstream sources, typically daily',
    terms: 'U.S. federal government data. Terms not re-verified in this build.',
    ...SOURCE_CLOCKS.eonet,
    requiresEnv: null,
  },
  weather: {
    id: 'weather',
    name: 'Open-Meteo forecast API',
    publisher: 'Open-Meteo',
    measures: 'Wind at twelve container ports',
    homepage: 'https://open-meteo.com/',
    cadence: 'Current conditions at fifteen-minute resolution',
    terms:
      'Free API is for NON-COMMERCIAL use only; a site with subscriptions or advertising needs a paid plan (Open-Meteo terms). Data under CC BY 4.0, attribution required.',
    ...SOURCE_CLOCKS.weather,
    requiresEnv: null,
  },
  fred: {
    id: 'fred',
    name: 'FRED',
    publisher: 'Federal Reserve Bank of St. Louis, from EIA and Federal Reserve Board data',
    measures: 'Crude oil, natural gas, diesel and the dollar',
    homepage: 'https://fred.stlouisfed.org/',
    cadence: 'Daily settlement values, published about a business day later; diesel weekly',
    terms:
      'The series shown are U.S. government data (EIA, Federal Reserve Board) and in the public domain; FRED asks that it be cited as the source. Stated from the series notes, not re-verified per series in this build.',
    ...SOURCE_CLOCKS.fred,
    requiresEnv: null,
  },
  quotes: {
    id: 'quotes',
    name: 'Finnhub stock quotes',
    publisher: 'Finnhub',
    measures: 'Share prices of freight, energy and market funds',
    homepage: 'https://finnhub.io/',
    cadence: 'Last trade price; the previous session outside trading hours',
    terms:
      "Finnhub's free plan is for personal, non-commercial use. Showing its prices on a public website is redistribution and needs a paid plan or Finnhub's written permission. Off unless FINNHUB_API_KEY is set.",
    ...SOURCE_CLOCKS.quotes,
    requiresEnv: 'FINNHUB_API_KEY',
  },
};
