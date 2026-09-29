import { publication } from '@/config/publication';
import { absoluteUrl } from '@/lib/env';
import { FLAG_RULES, LIVE_REVALIDATE_SECONDS, LIVE_SOURCE_IDS, PROXIMITY_KM, SOURCE_META } from '@/lib/live';
import { readMonitor } from '@/lib/monitor';

/**
 * The live snapshot, machine-readable — the same data /monitor renders.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS
 *
 * /register.json is the seam for alerts on the register (§6c). This is the
 * same seam for live readings: a separate watcher service (§14.2) can poll
 * it, compare against what it saw last, and decide whether anything crossed a
 * line a reader asked to hear about. The site does not do that deciding —
 * it stays a publication.
 *
 * ---------------------------------------------------------------------------
 * THE TWO FIELDS A CONSUMER MUST READ
 *
 * `asOf` on each reading is when the SOURCE produced the data, taken from
 * inside the payload. `generatedAt` is when this file was assembled. A
 * consumer that treats `generatedAt` as the age of the data will be wrong in
 * exactly the way this layer was built to prevent — the file is cached for
 * up to fifteen minutes and a source can lag far longer than that.
 *
 * A reading whose `status` is not "ok" carries no data at all. There is no
 * last-known value kept around to fill the gap: a consumer that needs one
 * must keep it itself, with its own timestamp.
 *
 * ---------------------------------------------------------------------------
 * SECRETS
 *
 * Nothing here can carry the AISStream key. It is read once, inside the
 * adapter, and never stored on a Reading; a missing key surfaces only as the
 * NAME of the variable. Keep it that way.
 *
 * Terms travel with the data (`sources[].terms`, `attribution`), because
 * republishing this file republishes GDELT and Open-Meteo data, and both
 * attach conditions to that.
 * ---------------------------------------------------------------------------
 */

export const dynamic = 'force-static';
// Literal, for the same reason as /monitor: Next 16 reads this statically.
export const revalidate = 900;
export const maxDuration = 60;

export async function GET() {
  // Read exactly as /monitor reads it, so the app and the page can never
  // disagree about what is flagged.
  const { snapshot, flags, places: board, registerByPlace } = await readMonitor();
  const places = board.map((place) => ({
    ...place,
    // Register entries naming this place, so a client can link a flag
    // straight to the assessment — or see that there is none yet.
    register: (registerByPlace[place.nodeId] ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      url: absoluteUrl(`/disruptions/${d.id}`),
    })),
  }));

  const body = {
    version: 1,
    title: `${publication.name} — live readings`,
    home_page_url: absoluteUrl('/monitor'),
    feed_url: absoluteUrl('/live.json'),
    description:
      'Raw readings from public feeds on shipping, conflict reporting against normal, natural hazards, port ' +
      'weather and energy prices, with the flags and place board derived from them. ' +
      'These are not assessments and do not feed the register. Each reading ' +
      'carries asOf — when its source produced it — which is the only valid measure of its age.',
    refresh_seconds: LIVE_REVALIDATE_SECONDS,
    proximity_km: PROXIMITY_KM,
    attribution: [
      'Conflict reporting: The GDELT Project, https://www.gdeltproject.org/',
      'Energy prices: U.S. Energy Information Administration; dollar index: Federal Reserve Board; via FRED, https://fred.stlouisfed.org/',
      'Weather data by Open-Meteo.com, CC BY 4.0, https://open-meteo.com/',
    ],
    sources: LIVE_SOURCE_IDS.map((id) => {
      const meta = SOURCE_META[id];
      return {
        id,
        name: meta.name,
        publisher: meta.publisher,
        homepage: meta.homepage,
        measures: meta.measures,
        cadence: meta.cadence,
        terms: meta.terms,
        delayed_after_minutes: meta.delayedAfterMinutes,
        stale_after_minutes: meta.staleAfterMinutes,
      };
    }),
    /**
     * Rule firings on the snapshot below. `id` is stable while the condition
     * holds: a watcher notifies on ids it has not seen before, exactly as it
     * diffs /register.json. `rules` states every rule in words.
     */
    flags,
    rules: FLAG_RULES,
    places,
    snapshot,
  };

  // No cache-control of our own: Next sets it from `revalidate`, and a
  // hand-written header that disagreed would be the one a CDN believed.
  return Response.json(body);
}
