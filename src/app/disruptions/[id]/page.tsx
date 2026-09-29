import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Assessment } from '@/components/assessment';
import { Container } from '@/components/container';
import { JsonLd } from '@/components/json-ld';
import { PrintPermalink } from '@/components/print-permalink';
import { ProseBody } from '@/components/prose-body';
import { SourceList } from '@/components/source-list';
import { hasCoAuthors, publication, recordedBy } from '@/config/publication';
import { StatusBadge } from '@/components/status-badge';
import { TextLink } from '@/components/text-link';
import type { Exposure } from '@/lib/disruptions';
import {
  CATEGORY_LABELS,
  STALE_AFTER_DAYS,
  getDisruption,
  isStale,
  listDisruptionIds,
} from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';
import { formatLongDate } from '@/lib/format';
import { disruptionJsonLd } from '@/lib/structured-data';

export async function generateStaticParams() {
  const ids = await listDisruptionIds();
  return ids.map((id) => ({ id }));
}

export const dynamicParams = false;

export async function generateMetadata(props: PageProps<'/disruptions/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  const disruption = await getDisruption(id);
  if (!disruption) return { title: 'Disruption not found' };

  return {
    title: disruption.title,
    description: disruption.summary,
    alternates: { canonical: absoluteUrl(`/disruptions/${disruption.id}`) },
    openGraph: {
      type: 'article',
      title: disruption.title,
      description: disruption.summary,
      url: absoluteUrl(`/disruptions/${disruption.id}`),
    },
  };
}

export default async function DisruptionPage(props: PageProps<'/disruptions/[id]'>) {
  const { id } = await props.params;
  const disruption = await getDisruption(id);
  if (!disruption) notFound();

  const started = formatLongDate(disruption.startedAt);
  const updated = formatLongDate(disruption.updatedAt);
  const stale = isStale(disruption.updatedAt);

  // The person who made this assessment. Falls back to the editor, who stands
  // behind anything the publication prints, and renders nothing at all while
  // there is only one author — see the comment at the <dl> below.
  const recorder = hasCoAuthors() ? recordedBy(disruption.author) : null;

  return (
    <article>
      <JsonLd
        data={disruptionJsonLd(disruption, absoluteUrl(`/disruptions/${disruption.id}`))}
      />

      <Container width="reading" className="pt-10 sm:pt-14">
        <p className="text-meta text-muted">
          <TextLink href="/disruptions" className="no-underline hover:underline">
            Disruptions
          </TextLink>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <StatusBadge status={disruption.status} />
          <span className="kicker kicker-muted">{CATEGORY_LABELS[disruption.category]}</span>
        </div>

        <h1 className="mt-4 text-title font-semibold text-fg">{disruption.title}</h1>

        <p className="mt-6 max-w-measure text-subhead text-muted">{disruption.summary}</p>

        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-3 border-t border-hairline pt-5 text-meta">
          {started ? (
            <div>
              <dt className="text-muted">Began</dt>
              <dd className="mt-0.5 text-fg">
                <time dateTime={disruption.startedAt}>{started}</time>
              </dd>
            </div>
          ) : null}
          {updated ? (
            <div>
              <dt className="text-muted">Last reviewed</dt>
              <dd className="mt-0.5 text-fg">
                <time dateTime={disruption.updatedAt}>{updated}</time>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Names affected</dt>
            <dd data-numeric className="mt-0.5 text-fg">
              {disruption.exposures.length}
            </dd>
          </div>
          {/* Only shown once there is more than one person on the masthead.
              On a one-author publication it would repeat the site-wide byline
              on every entry, which is noise; with two it is the answer to
              "who made this call", which is the whole point of the register. */}
          {recorder ? (
            <div>
              <dt className="text-muted">Recorded by</dt>
              <dd className="mt-0.5 text-fg">{recorder.name}</dd>
            </div>
          ) : null}
        </dl>

        {/* An assessment that has not been looked at recently says so, rather
            than presenting itself as current.

            Phrased against the build rather than against "now" on purpose: the
            page is static, so a day count rendered here would freeze at build
            time and could only ever understate the age. The absolute review
            date above is the figure that stays true. */}
        {stale ? (
          <p className="mt-6 border-l-2 border-status-active pl-4 text-meta text-muted">
            This entry had not been reviewed for over{' '}
            <span data-numeric>{STALE_AFTER_DAYS}</span> days when this page was built, and may
            have aged further since. Trust the review date above, not the freshness of the page.
          </p>
        ) : null}
      </Container>

      {disruption.contentHtml ? (
        <Container width="reading" className="mt-12">
          <ProseBody html={disruption.contentHtml} />
        </Container>
      ) : null}

      <Container width="reading" className="mt-16">
        <h2 className="text-heading font-semibold text-fg">Who this reaches</h2>
        <p className="mt-3 max-w-measure text-muted">
          Each entry states how the disruption reaches that company or sector, how well
          established the assessment is, and where it comes from.
        </p>

        {disruption.exposures.length === 0 ? (
          <p className="mt-6 max-w-measure text-muted">
            No exposure has been established yet. Nothing is listed here until the mechanism,
            confidence, date and source behind it all exist.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col">
            {disruption.exposures.map((exposure) => (
              <ExposureEntry key={exposure.entity.id} exposure={exposure} />
            ))}
          </ul>
        )}

        <p className="mt-8">
          <TextLink href="/exposure">See this alongside every other tracked disruption</TextLink>
        </p>
      </Container>

      <Container width="reading" className="mt-16">
        <h2 className="text-heading font-semibold text-fg">Sources</h2>
        <SourceList sources={disruption.sources} className="mt-5" />
      </Container>

      <Container width="reading" className="mt-16">
        <PrintPermalink path={`/disruptions/${disruption.id}`} className="mb-2" />
        <p className="max-w-measure text-meta text-muted">
          {publication.disclaimer}
        </p>
      </Container>
    </article>
  );
}

/** Anchored by entity id, so a chart cell can link straight to its own claim. */
function ExposureEntry({ exposure }: { exposure: Exposure }) {
  return (
    <li id={`entity-${exposure.entity.id}`} className="border-t border-hairline py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-[1.0625rem] font-medium">
          <TextLink
            standalone
            href={`/entities/${exposure.entity.id}`}
            className="no-underline hover:underline"
          >
            {exposure.entity.name}
          </TextLink>
        </h3>
        <p className="text-meta text-muted">
          {exposure.entity.ticker ? `${exposure.entity.ticker} · ` : ''}
          {exposure.entity.sector}
        </p>
      </div>

      <Assessment exposure={exposure} />
    </li>
  );
}
