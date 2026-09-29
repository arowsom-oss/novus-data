import { CountriesAgainstNormal, PlacesAgainstNormal } from '@/components/live/against-normal';
import { ExternalLink, TextLink } from '@/components/text-link';
import { formatCount, formatRatio, formatUtc } from '@/lib/live/display';
import type { GdeltData, Hotspot } from '@/lib/live/types';
import { PROXIMITY_KM, REPORTING_RULES } from '@/lib/live/types';

/**
 * "What's changing": where conflict reporting is above its own normal, and
 * which kinds of problem are taking a larger share of the news.
 *
 * Four forms, each chosen for its job:
 *
 * - Tracked places: a dot per place on a logarithmic axis of "times
 *   normal", with the published thresholds drawn on it (./against-normal).
 * - Cities reporting above normal: a ranked list. The ranking IS the
 *   information — which places are furthest above their own normal — and
 *   every row carries its count, its multiple and the articles behind it.
 * - Countries: a bar per country with a tick where normal would be.
 * - Problem types: a dumbbell per row — the normal share and the share in
 *   the last three hours on one common axis — because the question is "did
 *   this move, and which way", and two marks on one line answer it at a
 *   glance. Two series, so a legend is always shown, and both values are
 *   also written out in the row.
 *
 * Every mark is --accent or --accent-text; amber is reserved.
 */
export function ChangingPanel({ data }: { data: GdeltData }) {
  const maxShare = Math.max(0.0001, ...data.problems.flatMap((p) => [p.share, p.normalShare]));
  const pct = (share: number) => `${(share * 100).toFixed(share >= 0.01 ? 1 : 2)}%`;

  return (
    <>
      <p className="text-meta text-muted">
        The last three hours (<time dateTime={data.windowStart}>{formatUtc(data.windowStart)}</time> to{' '}
        <time dateTime={data.windowEnd}>{formatUtc(data.windowEnd)}</time>) compared with the same three
        hours on each of the previous {data.baselineDays} days —{' '}
        <span data-numeric>{data.recentFiles}</span> of <span data-numeric>{data.recentFilesExpected}</span> recent
        files and <span data-numeric>{data.baselineFiles}</span> of{' '}
        <span data-numeric>{data.baselineFilesExpected}</span> baseline files read.
      </p>

      <h3 className="kicker mt-8">Tracked places against their normal</h3>
      <p className="mt-1 max-w-[72ch] text-meta text-muted">
        Every port, strait and industrial cluster on this page with any conflict reporting nearby, placed against
        its own normal. A level is claimed only from <span data-numeric>{REPORTING_RULES.placeMinReports}</span>{' '}
        reports across <span data-numeric>{REPORTING_RULES.minEvents}</span> or more events.
      </p>
      <PlacesAgainstNormal places={data.places} />

      <h3 className="kicker mt-8">Places reporting above normal</h3>
      <p className="mt-1 max-w-[72ch] text-meta text-muted">
        Cities with at least <span data-numeric>{REPORTING_RULES.hotspotMinReports}</span> conflict reports across
        at least <span data-numeric>{REPORTING_RULES.minEvents}</span> separately coded events, and at least{' '}
        <span data-numeric>{REPORTING_RULES.hotspotMinRatio}×</span> their normal share of all reporting, ranked by
        how many reports above normal they are.
      </p>
      {data.hotspots.length === 0 ? (
        <p className="mt-3 text-[0.9375rem] text-muted">
          No city with a measurable normal crossed the thresholds in this window.
        </p>
      ) : (
        <ol className="mt-3 border-b border-hairline">
          {data.hotspots.map((spot) => (
            <HotspotRow key={spot.key} spot={spot} />
          ))}
        </ol>
      )}

      {data.noBaseline.length > 0 ? (
        <>
          <h3 className="kicker kicker-muted mt-8">Usually absent from the news</h3>
          <p className="mt-1 max-w-[72ch] text-meta text-muted">
            Cities that carry almost no conflict reporting at this time of day all week, and now clear the same report
            and event thresholds. With no normal to measure against, no multiple is given and none of them raises a
            flag. In the first real runs every one was a single story reprinted across a newspaper group, or a place
            GDELT&rsquo;s geocoder misread — follow the links before reading anything into one.
          </p>
          <ol className="mt-3 border-b border-hairline">
            {data.noBaseline.map((spot) => (
              <HotspotRow key={spot.key} spot={spot} />
            ))}
          </ol>
        </>
      ) : null}

      {data.countries.length > 0 ? (
        <>
          <h3 className="kicker mt-8">Countries reporting above normal</h3>
          <p className="mt-1 max-w-[72ch] text-meta text-muted">
            At least <span data-numeric>{REPORTING_RULES.countryMinReports}</span> reports and{' '}
            <span data-numeric>{REPORTING_RULES.countryMinRatio}×</span> the normal share, including stories GDELT
            could place only at country level.
          </p>
          <CountriesAgainstNormal countries={data.countries} />
        </>
      ) : null}

      <h3 className="kicker mt-8">Which problems are rising</h3>
      <p className="mt-1 max-w-[72ch] text-meta text-muted">
        Each kind of problem&rsquo;s share of all reporting — strikes, blockades, sanctions — now and normally, by
        its CAMEO event code. Ranked by how far its share has moved.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-5 text-meta text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2 rounded-full border border-muted" /> Normal share
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-link" /> Last three hours
        </span>
      </p>
      <table className="mt-2 w-full border-collapse text-meta">
        <caption className="sr-only">
          Share of all reporting by kind of problem, in the last three hours and normally.
        </caption>
        <thead>
          <tr className="border-b border-rule text-left text-muted">
            <th scope="col" className="py-2 pr-4 font-normal">Problem</th>
            <th scope="col" className="hidden w-[36%] py-2 pr-4 font-normal sm:table-cell">
              <span className="sr-only">Chart</span>
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">Now</th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">Normal</th>
            <th scope="col" className="py-2 text-right font-normal">Change</th>
          </tr>
        </thead>
        <tbody>
          {data.problems.map((problem) => {
            const now = (problem.share / maxShare) * 100;
            const normal = (problem.normalShare / maxShare) * 100;
            return (
              <tr key={problem.id} className="border-b border-hairline">
                <th scope="row" className="py-2.5 pr-4 text-left text-[0.9375rem] font-normal text-fg">
                  {problem.label}
                </th>
                <td className="hidden py-2.5 pr-4 sm:table-cell">
                  <span className="relative block h-3" aria-hidden="true">
                    <span
                      className="absolute top-1/2 h-px -translate-y-1/2 bg-accent"
                      style={{ left: `${Math.min(now, normal)}%`, width: `${Math.abs(now - normal)}%` }}
                    />
                    <span
                      className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted bg-ink"
                      style={{ left: `${normal}%` }}
                    />
                    <span
                      className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-link ring-2 ring-ink"
                      style={{ left: `${now}%` }}
                    />
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-fg">
                  <span data-numeric>{pct(problem.share)}</span>
                </td>
                <td className="py-2.5 pr-3 text-right text-muted">
                  <span data-numeric>{pct(problem.normalShare)}</span>
                </td>
                <td className="py-2.5 text-right text-fg">
                  {/* "new" only when there is reporting now and none normally;
                      nothing either time is a dash, not news. */}
                  <span data-numeric>
                    {problem.ratio !== null ? formatRatio(problem.ratio) : problem.reports > 0 ? 'new' : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/**
 * One city: its multiple of a measured normal — or, with no normal to
 * measure, its report count — what the count rests on, and where it is.
 */
function HotspotRow({ spot }: { spot: Hotspot }) {
  return (
    <li className="grid gap-x-5 gap-y-1 border-t border-hairline py-3 sm:grid-cols-[5.5rem_1fr]">
      <span className="text-meta">
        <span data-numeric className="block text-[1.0625rem] font-semibold text-fg">
          {spot.floored ? formatCount(spot.reports) : formatRatio(spot.ratio)}
        </span>
        <span className="text-muted">{spot.floored ? 'reports' : 'normal'}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold leading-snug text-fg">{spot.name}</span>
        <span className="mt-0.5 block text-meta text-muted">
          {spot.floored ? (
            <>
              Across <span data-numeric>{formatCount(spot.events)}</span> events, where fewer than{' '}
              <span data-numeric>{REPORTING_RULES.minExpected}</span> reports would be normal
            </>
          ) : (
            <>
              <span data-numeric>{formatCount(spot.reports)}</span> reports across{' '}
              <span data-numeric>{formatCount(spot.events)}</span> events, against about{' '}
              <span data-numeric>{formatCount(spot.expected)}</span> normally
            </>
          )}
          {spot.nearest ? (
            <>
              {' · '}
              <span data-numeric>{formatCount(spot.nearest.km)}</span> km from{' '}
              {spot.nearest.km <= PROXIMITY_KM ? (
                <TextLink href={`#place-${spot.nearest.nodeId}`}>{spot.nearest.nodeName}</TextLink>
              ) : (
                <>the nearest tracked place, {spot.nearest.nodeName}</>
              )}
            </>
          ) : null}
        </span>
        {spot.sources.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-x-3 text-meta text-muted">
            <span>Reporting:</span>
            {spot.sources.map((source) => (
              <ExternalLink key={source.url} href={source.url}>
                {source.domain}
              </ExternalLink>
            ))}
          </span>
        ) : null}
      </span>
    </li>
  );
}
