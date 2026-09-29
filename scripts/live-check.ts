/**
 * `npm run live:check` — read every live feed once, for real, and report what
 * came back.
 *
 *   npm run live:check              the report
 *   npm run live:check -- --strict  exit 1 if any keyless feed is unavailable
 *
 * WHY THIS EXISTS
 *
 * The adapters in src/lib/live/sources/ were written against each publisher's
 * documented response shape, and the environment they were built in could not
 * reach any of the feeds. Every adapter fails safe — a shape it does not
 * recognise becomes "unavailable" on the page, never a wrong number — but
 * "fails safe" is not the same as "works". This is the first thing to run
 * anywhere the network is open, and it answers, per feed: did it respond, did
 * the parser recognise the response, how old is the data, and what caveats
 * were raised.
 *
 * It calls the same readLiveSnapshot() the page calls, so it cannot pass while
 * the page fails. `fetch`'s Next-specific cache options are simply ignored
 * outside Next, so every run here is a real request.
 *
 * **It never prints the AISStream key** — only whether it is set. The same
 * rule as `doctor`: this output is the kind of thing that gets pasted into a
 * chat when asking for help.
 *
 * Takes about 35 seconds with an AIS key (the vessel sample is 30 seconds
 * long) and a few seconds without one.
 */

import type { LiveSnapshot, LiveSourceId } from '@/lib/live/types';

import { blank, blocker, colour, detail, heading, info, loadEnvLocal, ok, plural, warn } from './lib/cli';

async function main(): Promise<void> {
  loadEnvLocal();
  const strict = process.argv.includes('--strict');

  // Loaded after .env.local, so the key and CONTENT_SOURCE are visible.
  const { readLiveSnapshot, getLiveSourceName } = await import('@/lib/live/sources');
  const { SOURCE_META } = await import('@/lib/live/meta');
  const { FRESHNESS_LABELS, LIVE_SOURCE_IDS, freshnessFor } = await import('@/lib/live/types');
  const { formatAge } = await import('@/lib/live/display');

  if (getLiveSourceName() === 'fixtures') {
    warn('CONTENT_SOURCE=fixtures is set, so this reads the built-in samples, not the network.');
    detail('Unset it (in .env.local or the shell) to check the real feeds.');
    blank();
  }

  for (const id of LIVE_SOURCE_IDS) {
    const envVar = SOURCE_META[id].requiresEnv;
    if (envVar) info(`${envVar} is ${process.env[envVar]?.trim() ? 'set' : 'not set'}.`);
  }
  info('Reading every feed — about 35 seconds…');

  const started = Date.now();
  const snapshot = await readLiveSnapshot();
  info(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);

  let failures = 0;

  for (const id of LIVE_SOURCE_IDS) {
    const reading = snapshot[id];
    const meta = SOURCE_META[id];
    heading(`${meta.name} — ${meta.measures}`);

    if (reading.status === 'not-configured') {
      info(`Not configured: ${reading.envVar} is not set. The page says "not switched on yet".`);
      continue;
    }
    if (reading.status === 'unavailable') {
      failures += 1;
      blocker(`Unavailable: ${reading.reason}`);
      detail(
        'An HTTP status means the request was answered but refused. A parse failure means\n' +
          'the feed answered and the adapter did not recognise the shape — fix\n' +
          `src/lib/live/sources/${id}.ts and re-run.`,
      );
      continue;
    }

    const age = (Date.now() - Date.parse(reading.asOf)) / 60_000;
    const freshness = freshnessFor(age, meta);
    const line = `As of ${reading.asOf} (${reading.asOfBasis}) — ${formatAge(age)} old, ${FRESHNESS_LABELS[freshness]}`;
    if (freshness === 'live') ok(line);
    else warn(line);

    // `id` is a union here, so TypeScript cannot pair each describer with its data.
    for (const summary of DESCRIBE[id](reading.data as never)) detail(summary);
    for (const note of reading.notes) detail(colour.dim(`note: ${note}`));
  }

  // The same refusal from every keyless feed at once is the signature of the
  // network in between (a proxy or an egress allowlist), not of six unrelated
  // publishers all failing together.
  const keyless = LIVE_SOURCE_IDS.filter((id) => SOURCE_META[id].requiresEnv === null);
  const reasons = keyless.map((id) => snapshot[id]).filter((r) => r.status === 'unavailable');
  if (reasons.length === keyless.length && reasons.every((r) => /HTTP 40[37]/.test(r.status === 'unavailable' ? r.reason : ''))) {
    blank();
    warn('Every keyless feed was refused the same way. That is almost certainly this machine\'s');
    detail(
      'network (a proxy or allowlist), not the feeds. Run this where the internet is open —\n' +
        'your own computer, or check the Vercel build log, where /monitor is generated.',
    );
  }

  blank();
  if (failures === 0) {
    ok('Every configured feed answered and parsed.');
  } else {
    warn(`${plural(failures, 'feed')} unavailable. The page shows each as "unavailable" with the reason above.`);
  }
  blank();

  if (strict && failures > 0) process.exitCode = 1;
}

type DataOf<K extends LiveSourceId> = Extract<LiveSnapshot[K], { status: 'ok' }>['data'];

/** One or two lines per feed saying what was actually recognised in the response. */
const DESCRIBE: { [K in LiveSourceId]: (data: DataOf<K>) => string[] } = {
  ais: (d) => {
    const heard = d.chokepoints.filter((row) => row.messages > 0);
    const lines = [
      `${heard.length} of ${d.chokepoints.length} chokepoint boxes received messages in the ${d.windowSeconds}-second sample.`,
    ];
    if (heard.length > 0) {
      lines.push(heard.map((row) => `${row.nodeId} ${row.vesselsUnderway}`).join(', ') + ' (under way)');
    }
    return lines;
  },
  gdelt: (g) => {
    const lines = [
      `${g.recentFiles}/${g.recentFilesExpected} recent and ${g.baselineFiles}/${g.baselineFilesExpected} baseline event files read; ${g.totalReports} reports, ${g.conflictReports} conflict-type.`,
      `${g.hotspots.length} hotspots.`,
      // The top few in full, so a real run shows whether a surge rests on
      // several events and publishers or on one syndicated story.
      ...g.hotspots.slice(0, 5).map(
        (h) =>
          `  ${h.name}: ${h.reports} reports / ${h.events} events, normal ${h.expected.toFixed(1)}${h.floored ? ' (floored)' : ''}, ${h.ratio.toFixed(1)}×; ${h.sources.map((s) => s.domain).join(', ') || 'no links'}`,
      ),
      `${g.noBaseline.length} with no measurable normal (listed, never flagged)${g.noBaseline.length > 0 ? ':' : '.'}`,
      ...g.noBaseline.map(
        (h) => `  ${h.name}: ${h.reports} reports / ${h.events} events; ${h.sources.map((s) => s.domain).join(', ') || 'no links'}`,
      ),
      `${g.countries.length} countries above normal.`,
      `Places not normal: ${g.places.filter((p) => p.level !== 'normal').map((p) => `${p.nodeId} ${p.level} (${Math.round(p.reports)} vs ${p.expected.toFixed(1)})`).join(', ') || 'none'}.`,
    ];
    if (g.totalReports > 0 && g.conflictReports / g.totalReports > 0.8) {
      lines.push(colour.amber('Conflict share above 80% of all reporting — check the QuadClass column mapping.'));
    }
    return lines;
  },
  usgs: (d) => [`${d.quakes.length} earthquakes, magnitude ${d.minMagnitude}+.`],
  gdacs: (d) => [`${d.alerts.length} open alerts at levels ${d.levels.join(', ')}.`],
  nhc: (d) => [`${d.storms.length} active storms.`],
  eonet: (d) => [`${d.totalOpen} open events; ${d.nearTradeNodes.length} near a tracked location.`],
  weather: (d) => [`${d.ports.length} ports with current wind.`],
  fred: (d) => d.series.map((s) => `${s.id}: ${s.latest.value} on ${s.latest.date} (${s.points.length} observations)`),
  quotes: (q) => [
    `${q.quotes.length} prices: ${q.quotes.map((x) => `${x.symbol} ${x.price}`).join(', ')}.`,
    ...(q.missing.length > 0 ? [`No price for: ${q.missing.join(', ')}.`] : []),
  ],
};

main().catch((error: unknown) => {
  console.error(colour.red('\nlive:check failed to run:'));
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
