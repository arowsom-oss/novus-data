import { formatCount, formatRatioOf } from '@/lib/live/display';
import { nodeById } from '@/lib/live/nodes';
import {
  REPORTING_LEVEL_LABELS,
  REPORTING_RULES,
  type CountrySurge,
  type PlaceReporting,
} from '@/lib/live/types';

/**
 * Two charts of conflict reporting against its own normal, drawn from the
 * GDELT reading the page already has. Nothing here is new data; both put the
 * same numbers the text states on an axis, so a reader sees at a glance what
 * the rows say one at a time.
 *
 * Built from styled elements, like the page's other charts, so every row
 * keeps real text: the chart is decoration over a list a screen reader reads
 * in full. Marks use --accent and --accent-text, with muted grey for what
 * is not the point (the emphasis form); amber is reserved.
 */

// ---------------------------------------------------------------------------
// Tracked places against their normal
//
// A multiple of normal is a ratio, so the axis is logarithmic: 0.5× and 2×
// sit the same distance either side of normal, and one place at 40× does not
// flatten everything else into the left edge. The published thresholds are
// drawn on the axis itself, so a reader checks a flag against its rule by
// looking, not by reading.
// ---------------------------------------------------------------------------

const LOG_LOW = 0.25;
const LOG_CEILINGS = [5, 10, 20, 50, 100, 200, 500, 1000];

function logPosition(value: number, high: number): number {
  const at = (Math.log(Math.max(value, LOG_LOW)) - Math.log(LOG_LOW)) / (Math.log(high) - Math.log(LOG_LOW));
  return Math.min(1, Math.max(0, at)) * 100;
}

/** Whether a level is claimed at all: the same test the reading applies before calling anything elevated. */
function judged(place: PlaceReporting): boolean {
  return place.reports >= REPORTING_RULES.placeMinReports && place.events >= REPORTING_RULES.minEvents;
}

export function PlacesAgainstNormal({ places }: { places: PlaceReporting[] }) {
  const reporting = places.filter((place) => place.reports > 0).sort((a, b) => b.ratio - a.ratio);
  const silent = places.length - reporting.length;

  if (reporting.length === 0) {
    return (
      <p className="mt-3 text-[0.9375rem] text-muted">
        No conflict reporting was placed near any tracked place in this window.
      </p>
    );
  }

  const high = LOG_CEILINGS.find((ceiling) => ceiling >= Math.max(...reporting.map((p) => p.ratio))) ?? 1000;
  const ticks = [LOG_LOW, 1, REPORTING_RULES.elevatedRatio, REPORTING_RULES.surgingRatio, 10, 100, 1000]
    .filter((tick) => tick < high)
    .concat(high);
  const lines = [
    { at: 1, className: 'border-l border-rule' },
    { at: REPORTING_RULES.elevatedRatio, className: 'border-l border-dashed border-accent' },
    { at: REPORTING_RULES.surgingRatio, className: 'border-l border-dashed border-accent' },
  ];

  return (
    <figure className="mt-3">
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-meta text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-link" aria-hidden="true" /> Above normal
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-muted" aria-hidden="true" /> Normal
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full border border-muted" aria-hidden="true" /> Too few
          reports to judge
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 border-l border-dashed border-accent" aria-hidden="true" /> Thresholds:
          elevated from <span data-numeric>{REPORTING_RULES.elevatedRatio}×</span>, surging from{' '}
          <span data-numeric>{REPORTING_RULES.surgingRatio}×</span>
        </span>
      </figcaption>

      <div className="mt-3 border-b border-hairline">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] text-meta text-muted sm:grid-cols-[11rem_minmax(0,1fr)_10rem]" aria-hidden="true">
          <span className="relative col-span-2 h-5 sm:col-span-1 sm:col-start-2">
            <span className="absolute inset-x-2 inset-y-0">
              {ticks.map((tick, index) => (
                <span
                  key={tick}
                  data-numeric
                  className={`absolute top-0 ${index === 0 ? '' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                  style={{ left: `${logPosition(tick, high)}%` }}
                >
                  {tick}×
                </span>
              ))}
            </span>
          </span>
        </div>
        <ol>
          {reporting.map((place) => {
            const name = nodeById(place.nodeId)?.name ?? place.nodeId;
            const claimed = judged(place);
            const verdict = claimed ? REPORTING_LEVEL_LABELS[place.level] : 'Too few reports to judge';
            const mark = !claimed
              ? 'border border-muted bg-ink'
              : place.level === 'normal'
                ? 'bg-muted'
                : 'bg-link';
            return (
              <li
                key={place.nodeId}
                title={`${name}: ${formatRatioOf(place.ratio, place.floored)} its normal share, ${formatCount(place.reports)} reports — ${verdict.toLowerCase()}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-hairline sm:grid-cols-[11rem_minmax(0,1fr)_10rem]"
              >
                <span className="col-start-1 row-start-1 py-2 pr-3 text-[0.9375rem] leading-snug text-fg">{name}</span>
                <span className="relative col-span-2 row-start-2 h-6 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-auto" aria-hidden="true">
                  {/* Inset, so a mark at either end of the scale is not clipped. */}
                  <span className="absolute inset-x-2 inset-y-0">
                    {lines.map((line) => (
                      <span
                        key={line.at}
                        className={`absolute inset-y-0 ${line.className}`}
                        style={{ left: `${logPosition(line.at, high)}%` }}
                      />
                    ))}
                    <span
                      className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-ink ${mark}`}
                      style={{ left: `${logPosition(place.ratio, high)}%` }}
                    />
                  </span>
                </span>
                <span className="col-start-2 row-start-1 py-2 text-right text-meta sm:col-start-3 sm:pl-3">
                  <span data-numeric className={claimed && place.level !== 'normal' ? 'font-semibold text-fg' : 'text-fg'}>
                    {formatRatioOf(place.ratio, place.floored)}
                  </span>
                  <span className="block text-muted">
                    <span data-numeric>{formatCount(place.reports)}</span> reports · {verdict.toLowerCase()}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-2 text-meta text-muted">
        Each dot is a place&rsquo;s share of all reporting against its normal share for this time of day, on a
        logarithmic scale. A multiple marked <span data-numeric>≥</span> is a lower bound: fewer than{' '}
        <span data-numeric>{REPORTING_RULES.minExpected}</span> reports would be normal there.
        {silent > 0 ? (
          <>
            {' '}
            <span data-numeric>{silent}</span> other tracked {silent === 1 ? 'place had' : 'places had'} no conflict
            reporting in the window.
          </>
        ) : null}
      </p>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Countries against their normal
//
// Here the question is magnitude — how much reporting, against how much would
// be normal — so a bar per country from a zero baseline, with a tick where
// normal would be. One axis for all rows, so the bars compare.
// ---------------------------------------------------------------------------

export function CountriesAgainstNormal({ countries }: { countries: CountrySurge[] }) {
  const scale = Math.max(1, ...countries.flatMap((country) => [country.reports, country.expected]));

  return (
    <figure className="mt-3">
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-meta text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-r-[4px] bg-accent" aria-hidden="true" /> Reports, last three
          hours
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3.5 w-0.5 bg-fg" aria-hidden="true" /> Normal for this time of day
        </span>
      </figcaption>
      <ol className="mt-3 border-b border-hairline">
        {countries.map((country) => (
          <li
            key={country.code}
            title={`${country.name}: ${formatCount(country.reports)} reports, ${
              country.floored ? `fewer than ${REPORTING_RULES.minExpected}` : `about ${formatCount(country.expected)}`
            } normally`}
            className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-hairline sm:grid-cols-[11rem_minmax(0,1fr)_10rem]"
          >
            <span className="col-start-1 row-start-1 py-2 pr-3 text-[0.9375rem] leading-snug text-fg">{country.name}</span>
            <span className="relative col-span-2 row-start-2 mb-2 h-3.5 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mb-0 sm:self-center" aria-hidden="true">
              <span
                className="absolute inset-y-0.5 left-0 min-w-[2px] rounded-r-[4px] bg-accent"
                style={{ width: `${(country.reports / scale) * 100}%` }}
              />
              <span
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg ring-1 ring-ink"
                style={{ left: `${(country.expected / scale) * 100}%` }}
              />
            </span>
            <span className="col-start-2 row-start-1 py-2 text-right text-meta sm:col-start-3 sm:pl-3">
              <span data-numeric className="text-fg">
                {formatRatioOf(country.ratio, country.floored)}
              </span>
              <span className="block text-muted">
                <span data-numeric>{formatCount(country.reports)}</span> vs{' '}
                {country.floored ? (
                  <>
                    under <span data-numeric>{REPORTING_RULES.minExpected}</span>
                  </>
                ) : (
                  <>
                    ~<span data-numeric>{formatCount(country.expected)}</span>
                  </>
                )}{' '}
                normally
              </span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
