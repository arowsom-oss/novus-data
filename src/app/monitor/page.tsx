import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Container } from '@/components/container';
import { AutoRefresh } from '@/components/live/auto-refresh';
import { ChangingPanel } from '@/components/live/changing-panel';
import { FlagList } from '@/components/live/flag-list';
import { LiveAge } from '@/components/live/live-age';
import { EnergyPanel, QuotesTable } from '@/components/live/markets-panel';
import { PlaceBoard, ReportingRadii } from '@/components/live/place-board';
import { ReadingBlock } from '@/components/live/reading-block';
import { PageHeader } from '@/components/page-header';
import { ExternalLink, TextLink } from '@/components/text-link';
import { absoluteUrl } from '@/lib/env';
import {
  CHOKEPOINTS,
  FLAG_RULES,
  INDUSTRIAL,
  LIVE_SOURCE_IDS,
  PORTS,
  PROXIMITY_KM,
  SOURCE_META,
  getLiveSourceName,
  nodeById,
  type AisData,
  type EonetData,
  type GdacsData,
  type LiveSnapshot,
  type NearestNode,
  type NhcData,
  type Reading,
  type UsgsData,
  type WeatherData,
} from '@/lib/live';
import { formatCount, formatUtc, formatUtcDate, formatUtcShort } from '@/lib/live/display';
import { readMonitor } from '@/lib/monitor';

/**
 * /monitor — the live page.
 *
 * ---------------------------------------------------------------------------
 * HOW "LIVE" WORKS HERE
 *
 * The page is regenerated on the server at most every fifteen minutes
 * (Incremental Static Regeneration) and served from cache in between, so a
 * thousand readers cost the upstream feeds one request per cycle, not a
 * thousand. The rest of the site stays fully static; only this page and
 * /live.json revalidate. See CLAUDE.md §6d.
 *
 * `revalidate` must be the literal 900. Next 16 reads it statically, and an
 * imported constant (LIVE_REVALIDATE_SECONDS) would be silently ignored.
 *
 * `maxDuration` covers the slowest regeneration: a 30-second vessel sample
 * (plus up to 10 s to connect) running alongside GDELT, which is held to a
 * 32-second budget because a throttled GDELT once took 78 s (§6d findings).
 *
 * Every reading states when its SOURCE produced it, and its age is computed
 * in the reader's browser (LiveAge). A cached page can therefore be old, but
 * it cannot say it is new.
 * ---------------------------------------------------------------------------
 */
export const revalidate = 900;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Monitor',
  description:
    'What is changing in physical trade: where reporting of strikes, blockades, sanctions and fighting is above normal, flags at ports and straits, ships at ten chokepoints, hazards, port wind and energy prices. Re-read every fifteen minutes, each with its source and time.',
  alternates: { canonical: absoluteUrl('/monitor') },
};

const SECTION_FOR: Record<keyof Omit<LiveSnapshot, 'generatedAt'>, string> = {
  gdelt: 'changing',
  ais: 'chokepoints',
  usgs: 'hazards',
  gdacs: 'hazards',
  nhc: 'hazards',
  eonet: 'hazards',
  weather: 'weather',
  fred: 'markets',
  quotes: 'markets',
};

export default async function MonitorPage() {
  // The register supplies which entries name which places, and the tickers
  // of companies already on the exposure chart — see lib/monitor.ts.
  const { snapshot, flags, places, registerByPlace } = await readMonitor();
  const demo = getLiveSourceName() === 'fixtures';
  const everyFeedAnswered = LIVE_SOURCE_IDS.every((id) => snapshot[id].status !== 'unavailable');

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Monitor"
        lede="What is changing in physical trade right now: where problems are being reported above normal, hazards near ports and straits, ships moving through chokepoints, and energy prices. Re-read every fifteen minutes; every reading shows when its source produced it."
      />

      <Container className="mt-5">
        {demo ? (
          <p className="mb-6 border-l-2 border-link pl-3 text-[0.9375rem] text-fg">
            <span className="font-semibold">[SAMPLE] data.</span> This deployment is running
            against built-in examples, not the live feeds. No figure on this page is real.
          </p>
        ) : null}

        <div className="grid gap-x-10 gap-y-3 text-[0.9375rem] text-muted lg:grid-cols-2">
          <p className="max-w-[64ch]">
            These are raw readings, not assessments. Nothing here feeds the{' '}
            <TextLink href="/disruptions">register</TextLink> or the{' '}
            <TextLink href="/exposure">exposure chart</TextLink>: when a reading matters, it is
            written up there with a mechanism, sources and a review date.
          </p>
          <p className="max-w-[64ch] text-meta">
            Page assembled <LiveAge at={snapshot.generatedAt} />. Sources are re-read every fifteen
            minutes; an open page checks for a newer version every five, and each feed below keeps
            its own clock.
          </p>
        </div>

        <Section id="attention" title="Needs attention">
          <Intro>
            Every published rule that fired on the latest readings, alerts first. A flag is a reason
            to look, not a finding — the rules are listed below the flags.
          </Intro>
          <FlagList flags={flags} rules={FLAG_RULES} complete={everyFeedAnswered} />
        </Section>

        <Section id="changing" title="What&rsquo;s changing">
          <Intro>
            Where the world&rsquo;s news is reporting more conflict, disruption and unrest than it
            normally does — strikes, blockades, sanctions, seizures, fighting — measured against each
            place&rsquo;s own normal for this time of day. This counts reporting, not events: a rise
            means more is being written about a place, which is often the first sign, and is not
            proof that more is happening.
          </Intro>
          <ReadingBlock reading={snapshot.gdelt}>{(data) => <ChangingPanel data={data} />}</ReadingBlock>
        </Section>

        <Section id="places" title="Places">
          <Intro>
            Every tracked chokepoint, port and industrial cluster, with everything the feeds on this
            page say about it and any register entry that names it. Places with flags come first.
            Hazards count within {PROXIMITY_KM} km — a distance, not an assessment of impact.
          </Intro>
          <PlaceBoard places={places} register={registerByPlace} />
          <ReportingRadii />
        </Section>

        <Section id="chokepoints" title="Chokepoints">
          <Intro>
            Ships transmitting inside a box drawn across each strait or canal, heard during one
            short sample per update. It shows whether traffic is moving through — not how much
            cargo — and the rows are not comparable with each other, because receiver coverage
            differs from one strait to the next. The order is fixed so a change is easy to spot.
          </Intro>
          <ReadingBlock reading={snapshot.ais}>{(data) => <ChokepointTable data={data} />}</ReadingBlock>
        </Section>

        <Section id="markets" title="Energy and markets">
          <Intro>
            Crude oil, natural gas and diesel — the costs of moving goods — and the dollar, from U.S.
            government data. Daily settlement values, published about a business day later: an
            as-of date, not a live price.
          </Intro>
          <ReadingBlock reading={snapshot.fred}>{(data) => <EnergyPanel data={data} />}</ReadingBlock>

          <h3 className="kicker mt-10 mb-2">Share prices</h3>
          <ReadingBlock reading={snapshot.quotes}>{(data) => <QuotesTable data={data} />}</ReadingBlock>
        </Section>

        <Section id="hazards" title="Hazards near trade routes">
          <Intro>
            Natural hazards from four official feeds, each measured against the chokepoints, ports
            and industrial clusters listed at the foot of this page. &ldquo;Within{' '}
            {PROXIMITY_KM} km&rdquo; is a distance, not an assessment of impact.
          </Intro>
          <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2">
            <Hazard title="Earthquakes" reading={snapshot.usgs}>
              {(data) => <QuakeList data={data} />}
            </Hazard>
            <Hazard title="Disaster alerts" reading={snapshot.gdacs}>
              {(data) => <AlertList data={data} />}
            </Hazard>
            <Hazard title="Tropical cyclones" reading={snapshot.nhc}>
              {(data) => <StormList data={data} />}
            </Hazard>
            <Hazard title="Other natural events" reading={snapshot.eonet}>
              {(data) => <EventList data={data} />}
            </Hazard>
          </div>
        </Section>

        <Section id="weather" title="Port weather">
          <Intro>
            Current wind at twelve of the largest container ports, on the Beaufort scale. Wind is
            the weather most likely to stop a container terminal working, but the limits differ by
            port and by crane, so this reports the wind and makes no claim about operations.
          </Intro>
          <ReadingBlock reading={snapshot.weather}>{(data) => <WindTable data={data} />}</ReadingBlock>
        </Section>

        <FeedStatus snapshot={snapshot} />

        <Section id="sources" title="Sources and terms">
          <Attribution />
        </Section>
      </Container>

      <AutoRefresh />
    </>
  );
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="section-rule mt-12 sm:mt-16">
      <h2 id={`${id}-heading`} className="text-heading font-semibold text-fg">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Intro({ children }: { children: ReactNode }) {
  return <p className="mb-5 max-w-[72ch] text-[0.9375rem] leading-[1.55] text-muted">{children}</p>;
}

function Hazard<T>({
  title,
  reading,
  children,
}: {
  title: string;
  reading: Reading<T>;
  children: (data: T) => ReactNode;
}) {
  return (
    <div>
      <h3 className="kicker mb-2">{title}</h3>
      <ReadingBlock reading={reading}>{children}</ReadingBlock>
    </div>
  );
}

function FeedStatus({ snapshot }: { snapshot: LiveSnapshot }) {
  return (
    <section aria-labelledby="feeds-heading" className="section-rule mt-12 sm:mt-16">
      <h2 id="feeds-heading" className="kicker kicker-muted">
        Feed status
      </h2>
      <ul className="mt-3 border-b border-hairline">
        {LIVE_SOURCE_IDS.map((id) => {
          const reading = snapshot[id];
          const meta = SOURCE_META[id];
          return (
            <li
              key={id}
              className="grid gap-x-6 gap-y-0.5 border-t border-hairline py-2.5 text-meta sm:grid-cols-[minmax(0,19rem)_1fr]"
            >
              <span>
                <a
                  href={`#${SECTION_FOR[id]}`}
                  className="text-fg underline decoration-transparent underline-offset-[0.2em] transition-colors hover:decoration-[var(--accent-text)]"
                >
                  {meta.measures}
                </a>
                <span className="text-muted"> — {meta.name}</span>
              </span>
              <span className="text-muted">
                {reading.status === 'ok' ? (
                  <LiveAge at={reading.asOf} source={id} precision={SOURCE_META[id].asOfPrecision} />
                ) : reading.status === 'unavailable' ? (
                  <>
                    <span className="font-semibold text-fg">Unavailable</span> — {reading.reason}
                  </>
                ) : (
                  <span className="font-semibold text-fg">Not switched on yet</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Chokepoints — a table with inline bars
//
// Magnitude, one series, so one hue: --accent, the structural colour, at
// 3.1:1 on --ink (a non-text mark needs 3:1). Bars are anchored at the left
// baseline with a rounded data end. The value sits beside the bar in text
// colour, never in the bar's colour, and the whole table IS the table view.
// ---------------------------------------------------------------------------

function ChokepointTable({ data }: { data: AisData }) {
  const scale = Math.max(1, ...data.chokepoints.map((c) => c.vesselsUnderway));

  return (
    <table className="w-full border-collapse text-meta">
      <caption className="sr-only">
        Vessels heard in each chokepoint box during a {data.windowSeconds}-second sample ending{' '}
        {formatUtc(data.sampledAt)}.
      </caption>
      <thead>
        <tr className="border-b border-rule text-left text-muted">
          <th scope="col" className="py-2 pr-4 font-normal">
            Chokepoint
          </th>
          <th scope="col" className="py-2 pr-3 text-right font-normal">
            Under way
          </th>
          <th scope="col" className="w-[24%] py-2 pr-4 font-normal sm:w-[40%]">
            <span className="sr-only">Bar</span>
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            All heard
          </th>
        </tr>
      </thead>
      <tbody>
        {CHOKEPOINTS.map((node) => {
          const sample = data.chokepoints.find((c) => c.nodeId === node.id);
          const silent = !sample || sample.messages === 0;
          return (
            <tr key={node.id} className="border-b border-hairline align-top transition-colors hover:bg-surface">
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <span className="text-[0.9375rem] text-fg">{node.name}</span>
                {node.note ? <span className="mt-0.5 block max-w-[34ch] text-muted">{node.note}</span> : null}
              </th>
              <td className="py-2.5 pr-3 text-right text-fg">
                <span data-numeric>{silent ? '—' : sample.vesselsUnderway}</span>
              </td>
              <td className="py-2.5 pr-4">
                {silent ? (
                  <span className="text-muted">No signal in this sample</span>
                ) : (
                  <span className="mt-[0.3rem] block h-2 w-full">
                    <span
                      className="block h-full min-w-[2px] rounded-r-[4px] bg-accent"
                      style={{ width: `${(sample.vesselsUnderway / scale) * 100}%` }}
                    />
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right text-muted">
                <span data-numeric>{silent ? '—' : sample.vesselsObserved}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Hazards — lists, not charts. Each item is a distinct event with a name,
// a place and a link; there is no magnitude across them worth plotting.
// ---------------------------------------------------------------------------

function Row({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[4.75rem_1fr] gap-x-4 border-t border-hairline py-3">
      <span className="text-meta text-fg">{rail}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Proximity({ nearest }: { nearest: NearestNode | null }) {
  if (!nearest) return null;
  const within = nearest.km <= PROXIMITY_KM;
  return (
    <span className={`block text-meta ${within ? 'text-fg' : 'text-muted'}`}>
      {within ? (
        <>
          Within {PROXIMITY_KM} km of {nearest.nodeName} (<span data-numeric>{formatCount(nearest.km)}</span> km)
        </>
      ) : (
        <>
          Nearest tracked location: {nearest.nodeName}, <span data-numeric>{formatCount(nearest.km)}</span> km
        </>
      )}
    </span>
  );
}

const QUAKES_SHOWN = 8;

function QuakeList({ data }: { data: UsgsData }) {
  if (data.quakes.length === 0) {
    return (
      <p className="text-meta text-muted">
        No earthquakes of magnitude {data.minMagnitude} or above in the past {data.windowHours} hours.
      </p>
    );
  }
  const shown = data.quakes.slice(0, QUAKES_SHOWN);
  return (
    <>
      <ul className="border-b border-hairline">
        {shown.map((quake) => (
          <Row
            key={quake.id}
            rail={
              <>
                M <span data-numeric>{quake.magnitude.toFixed(1)}</span>
              </>
            }
          >
            <RowTitle href={quake.url}>{quake.place}</RowTitle>
            <span className="block text-meta text-muted">
              <time dateTime={quake.at}>{formatUtc(quake.at)}</time>
              {quake.depthKm !== null ? (
                <>
                  {' · '}
                  <span data-numeric>{formatCount(quake.depthKm)}</span> km deep
                </>
              ) : null}
            </span>
            <Proximity nearest={quake.nearest} />
            {quake.pagerAlert || quake.tsunamiFlag ? (
              <span className="block text-meta text-muted">
                {quake.pagerAlert ? `USGS PAGER alert: ${quake.pagerAlert}` : null}
                {quake.pagerAlert && quake.tsunamiFlag ? ' · ' : null}
                {quake.tsunamiFlag ? 'USGS tsunami flag set — an oceanic event, not itself a warning' : null}
              </span>
            ) : null}
          </Row>
        ))}
      </ul>
      {data.quakes.length > QUAKES_SHOWN ? (
        <p className="mt-2 text-meta text-muted">
          The {QUAKES_SHOWN} largest of <span data-numeric>{data.quakes.length}</span> in the past{' '}
          {data.windowHours} hours.{' '}
          <ExternalLink href={SOURCE_META.usgs.homepage}>The full list is at USGS.</ExternalLink>
        </p>
      ) : null}
    </>
  );
}

/** A hazard's name, linked to the publisher's page for it when the feed gave one. */
function RowTitle({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <ExternalLink href={href} className="text-[0.9375rem]">
      {children}
    </ExternalLink>
  ) : (
    <span className="text-[0.9375rem] text-fg">{children}</span>
  );
}

function AlertList({ data }: { data: GdacsData }) {
  if (data.alerts.length === 0) {
    return (
      <p className="text-meta text-muted">
        No {data.levels.join(' or ').toLowerCase()} alerts are open.
      </p>
    );
  }
  return (
    <ul className="border-b border-hairline">
      {data.alerts.map((alert) => (
        <Row key={alert.id} rail={<>{alert.level}</>}>
          <RowTitle href={alert.url}>{alert.name}</RowTitle>
          <span className="block text-meta text-muted">
            {alert.typeLabel}
            {alert.country ? ` · ${alert.country}` : ''}
            {alert.from ? (
              <>
                {' · from '}
                <time dateTime={alert.from}>{formatUtcDate(alert.from)}</time>
              </>
            ) : null}
            {alert.updated ? (
              <>
                {' · updated '}
                <time dateTime={alert.updated}>{formatUtcShort(alert.updated)}</time>
              </>
            ) : null}
          </span>
          <Proximity nearest={alert.nearest} />
        </Row>
      ))}
    </ul>
  );
}

function StormList({ data }: { data: NhcData }) {
  if (data.storms.length === 0) {
    return <p className="text-meta text-muted">No active tropical cyclones in the Atlantic or eastern Pacific.</p>;
  }
  return (
    <ul className="border-b border-hairline">
      {data.storms.map((storm) => (
        <Row key={storm.id} rail={<>{storm.classificationLabel}</>}>
          <RowTitle href={storm.advisoryUrl}>{storm.name}</RowTitle>
          <span className="block text-meta text-muted">
            {storm.intensityKt !== null ? (
              <>
                <span data-numeric>{storm.intensityKt}</span> kt winds
              </>
            ) : null}
            {storm.intensityKt !== null && storm.pressureMb !== null ? ' · ' : null}
            {storm.pressureMb !== null ? (
              <>
                <span data-numeric>{storm.pressureMb}</span> mb
              </>
            ) : null}
            {' · advisory '}
            <time dateTime={storm.updated}>{formatUtcShort(storm.updated)}</time>
          </span>
          <Proximity nearest={storm.nearest} />
        </Row>
      ))}
    </ul>
  );
}

function EventList({ data }: { data: EonetData }) {
  return (
    <>
      <p className="mb-3 text-meta text-muted">
        <span data-numeric>{data.totalOpen}</span> open events worldwide;{' '}
        <span data-numeric>{data.nearTradeNodes.length}</span> within {PROXIMITY_KM} km of a tracked
        location{data.nearTradeNodes.length > 0 ? ':' : '.'}
      </p>
      {data.nearTradeNodes.length > 0 ? (
        <ul className="border-b border-hairline">
          {data.nearTradeNodes.map((event) => (
            <Row key={event.id} rail={<>{event.category}</>}>
              <RowTitle href={event.url}>{event.title}</RowTitle>
              <span className="block text-meta text-muted">
                <time dateTime={event.at}>{formatUtcDate(event.at)}</time>
              </span>
              <Proximity nearest={event.nearest} />
            </Row>
          ))}
        </ul>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Port weather
// ---------------------------------------------------------------------------

function WindTable({ data }: { data: WeatherData }) {
  return (
    <table className="w-full max-w-[44rem] border-collapse text-meta">
      <caption className="sr-only">Current mean wind and gusts at ten metres, strongest first.</caption>
      <thead>
        <tr className="border-b border-rule text-left text-muted">
          <th scope="col" className="py-2 pr-4 font-normal">
            Port
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-normal">
            Wind, m/s
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-normal">
            Gusts
          </th>
          <th scope="col" className="py-2 font-normal">
            Beaufort
          </th>
        </tr>
      </thead>
      <tbody>
        {data.ports.map((port) => (
          <tr key={port.nodeId} className="border-b border-hairline transition-colors hover:bg-surface">
            <th scope="row" className="py-2 pr-4 text-left text-[0.9375rem] font-normal text-fg">
              {nodeById(port.nodeId)?.name ?? port.nodeId}
            </th>
            <td className="py-2 pr-4 text-right text-fg">
              <span data-numeric>{port.windMs.toFixed(1)}</span>
            </td>
            <td className="py-2 pr-4 text-right text-muted">
              <span data-numeric>{port.gustMs !== null ? port.gustMs.toFixed(1) : '—'}</span>
            </td>
            <td className={`py-2 ${port.beaufort >= 7 ? 'font-semibold text-fg' : 'text-muted'}`}>
              <span data-numeric>{port.beaufort}</span> · {port.beaufortLabel}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Sources, terms and the reference geometry
// ---------------------------------------------------------------------------

function Attribution() {
  return (
    <>
      {/* Required attributions first, worded as the providers ask. */}
      <ul className="max-w-[72ch] space-y-1.5 text-[0.9375rem] text-fg">
        <li>
          Conflict reporting: the GDELT Project,{' '}
          <ExternalLink href="https://www.gdeltproject.org/">gdeltproject.org</ExternalLink>.
        </li>
        <li>
          Energy prices: U.S. Energy Information Administration; the dollar index: Federal Reserve
          Board; both via <ExternalLink href="https://fred.stlouisfed.org/">FRED</ExternalLink>,
          Federal Reserve Bank of St. Louis.
        </li>
        <li>
          <ExternalLink href="https://open-meteo.com/">Weather data by Open-Meteo.com</ExternalLink>,
          licensed under{' '}
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>.
        </li>
      </ul>

      <dl className="mt-6 border-b border-hairline">
        {LIVE_SOURCE_IDS.map((id) => {
          const meta = SOURCE_META[id];
          return (
            <div key={id} className="grid gap-x-6 gap-y-1 border-t border-hairline py-3 sm:grid-cols-[14rem_1fr]">
              <dt>
                <ExternalLink href={meta.homepage} className="text-[0.9375rem]">
                  {meta.name}
                </ExternalLink>
                <span className="block text-meta text-muted">{meta.publisher}</span>
              </dt>
              <dd className="text-meta text-muted">
                <span className="block text-fg">{meta.measures}.</span>
                <span className="block">Updates: {meta.cadence}.</span>
                <span className="block">Terms: {meta.terms}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <details className="mt-6">
        <summary className="cursor-pointer text-meta text-link">Tracked locations</summary>
        <p className="mt-3 max-w-[72ch] text-meta text-muted">
          The reference points hazards are measured against. They are places, never companies: a
          distance to a port says nothing about any business using it. Chokepoint boxes are the areas
          vessels are counted in.
        </p>
        <div className="mt-3 grid gap-6 text-meta sm:grid-cols-3">
          {[
            { heading: 'Chokepoints', nodes: CHOKEPOINTS },
            { heading: 'Container ports', nodes: PORTS },
            { heading: 'Industrial clusters', nodes: INDUSTRIAL },
          ].map((group) => (
            <div key={group.heading}>
              <h3 className="kicker kicker-muted">{group.heading}</h3>
              <ul className="mt-2 space-y-1 text-fg">
                {group.nodes.map((node) => (
                  <li key={node.id}>{node.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
