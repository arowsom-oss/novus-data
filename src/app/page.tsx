import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ActionLink } from '@/components/action';
import { Container } from '@/components/container';
import { JsonLd } from '@/components/json-ld';
import { SeveritySwatch } from '@/components/severity-legend';
import { SignInPanel } from '@/components/sign-in-panel';
import { StatusBadge } from '@/components/status-badge';
import { SectionLabel, StoryBox } from '@/components/story-box';
import { SubscribePanel } from '@/components/subscribe-panel';
import { TextLink } from '@/components/text-link';
import { coverageTopics } from '@/config/coverage';
import { formatAuthorNames, publication } from '@/config/publication';
import type { DisruptionSummary, EntityExposure } from '@/lib/disruptions';
import { CATEGORY_LABELS, SEVERITY_LABELS, buildExposureMatrix, listDisruptions } from '@/lib/disruptions';
import type { IssueSummary } from '@/lib/content';
import { listArticles, listIssues } from '@/lib/content';
import { absoluteUrl, accountsConfigured } from '@/lib/env';
import { formatIssueLabel, formatLongDate, formatShortDate } from '@/lib/format';
import { publicationJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: publication.name,
  description: publication.description,
  alternates: { canonical: absoluteUrl('/') },
};

/**
 * The front page, laid out the way a paper lays out its own: a nameplate, a
 * lead story with a rail beside it, then bands of boxed stories.
 *
 * The lead is chosen, never written by hand: the most pressing open register
 * entry if there is one, otherwise the latest briefing, otherwise the case for
 * the publication itself. Every figure on the page is counted from the
 * register at build time, and a band with nothing real in it does not render.
 */
export default async function HomePage() {
  const [disruptions, issues, matrix, analysis] = await Promise.all([
    listDisruptions(),
    listIssues(3),
    buildExposureMatrix(),
    listArticles(undefined, 3),
  ]);

  const open = disruptions.filter((entry) => entry.status !== 'resolved');
  const [lead, ...rest] = open;
  const latestIssue = issues[0] ?? null;
  // The case for the site leads only while there is no real story to lead with.
  const explainerLeads = !lead && !latestIssue;

  const counts = registerCounts(disruptions, matrix.rows.length);

  return (
    <>
      <JsonLd data={publicationJsonLd()} />

      <Nameplate />

      <Container className="mt-6">
        <div className="grid gap-4 lg:grid-cols-12 [&>*]:min-w-0">
          {lead ? (
            <LeadDisruption disruption={lead} className="lg:col-span-8" />
          ) : latestIssue ? (
            <LeadIssue issue={latestIssue} className="lg:col-span-8" />
          ) : (
            <Explainer size="lead" className="lg:col-span-8" />
          )}

          <div className="flex flex-col gap-4 lg:col-span-4">
            <StoryBox as="aside" size="compact" level={2} kicker="Our mission" kickerTone="muted">
              <p className="text-[1.1875rem] font-semibold leading-snug tracking-[-0.01em] text-fg">
                {publication.mission}
              </p>
            </StoryBox>
            <SignInPanel enabled={accountsConfigured()} />
          </div>
        </div>
      </Container>

      {rest.length > 0 || matrix.rows.length > 0 ? (
        <Band id="register-now" label="In the register now">
          {rest.length > 0 ? (
            <AlsoOpen
              disruptions={rest.slice(0, 5)}
              className={matrix.rows.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}
            />
          ) : null}
          {matrix.rows.length > 0 ? (
            <MostExposed
              rows={matrix.rows.slice(0, 6)}
              className={rest.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}
            />
          ) : null}
        </Band>
      ) : null}

      {/* The latest briefing gets its own box only when something else is
          leading; when it is the lead, repeating it here would say it twice. */}
      {(latestIssue && lead) || analysis.length > 0 ? (
        <Band id="writing" label="Writing">
          {latestIssue && lead ? (
            <LatestBriefing
              issue={latestIssue}
              className={analysis.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'}
            />
          ) : null}
          {analysis.length > 0 ? (
            <LatestAnalysis
              posts={analysis}
              className={latestIssue && lead ? 'lg:col-span-6' : 'lg:col-span-12'}
            />
          ) : null}
        </Band>
      ) : null}

      <Band id="inside" label="Inside Novus Data">
        {explainerLeads ? null : <Explainer size="standard" className="lg:col-span-12" />}

        <StoryBox
          className="lg:col-span-7"
          kicker="The register"
          title="What is going wrong in physical trade, dated and sourced"
          titleHref="/disruptions"
          footer={
            <>
              <TextLink href="/disruptions">Open the register</TextLink>
              {counts ? <span>{counts.register}</span> : null}
            </>
          }
        >
          <p>
            One entry per problem: chokepoints, ports, trade policy, industrial inputs, energy and
            labour. Each carries its sources, a status and the date it was last reviewed, so an
            old assessment never passes for a current one.
          </p>
        </StoryBox>

        <StoryBox
          className="lg:col-span-5"
          kicker="The exposure chart"
          title="Which companies each problem reaches, and how"
          titleHref="/exposure"
          footer={
            <>
              <TextLink href="/exposure">Open the chart</TextLink>
              {counts ? <span>{counts.names}</span> : null}
            </>
          }
        >
          <p>
            Each tracked problem is mapped to the companies and sectors it reaches, with the
            mechanism written out. An assessment needs a mechanism, a confidence level, a date and
            a source to appear. The site drops any that lacks one when the page is built.
          </p>
        </StoryBox>

        <StoryBox
          className="lg:col-span-5"
          kicker="The monitor"
          title="What is changing now, from public feeds"
          titleHref="/monitor"
          footer={<TextLink href="/monitor">Open the monitor</TextLink>}
        >
          <p>
            Where news reporting of strikes, blockades, sanctions and fighting is running above
            its own normal, set beside natural hazards, port wind and energy prices, and re-read
            every fifteen minutes. Every reading shows the time its source produced it, and a feed
            that fails says so.
          </p>
        </StoryBox>

        <StoryBox
          className="lg:col-span-7"
          kicker={publication.newsletter.name}
          title="The week in writing, by email"
          titleHref="/briefings"
          footer={
            <>
              <TextLink href="/briefings">Read the archive</TextLink>
              <TextLink href="/subscribe">Subscribe</TextLink>
            </>
          }
        >
          <p>
            The briefing pulls the register and the monitor together: what moved, what it is likely
            to reach next, and what is worth ignoring. The site is the record; the briefing is the
            summary.
          </p>
        </StoryBox>
      </Band>

      <Band id="who-for" label="Who it is written for">
        <StoryBox
          className="lg:col-span-6"
          kicker="For investors"
          title="Physical trade breaks before prices move"
        >
          <p>
            A chokepoint closing absorbs vessel capacity across a whole market, not one route. A
            licence on one processed metal can reprice a sector that looked diversified. The gap
            between the event and the repricing is the only part anyone can act in.
          </p>
          <p>
            The exposure chart names what sits downstream of a problem and how strong the evidence
            is: reported, inferred or estimated. You can weigh each claim yourself instead of
            taking it on trust.
          </p>
        </StoryBox>

        <StoryBox
          className="lg:col-span-6"
          kicker="For operators"
          title="The decision comes before the confirmation"
        >
          <p>
            A rerouting adds weeks to transit time. That changes safety stock, working capital and
            every promise made downstream, and the call usually has to be made before the
            disruption is confirmed.
          </p>
          <p>
            The register gives the problem with its date and sources attached, so you can judge it
            rather than act on a headline. Where your suppliers or your category appear on the
            chart, the mechanism is written out, which is what makes it usable in front of a board
            or a customer.
          </p>
        </StoryBox>

        <p className="text-meta text-muted lg:col-span-12">{publication.disclaimer}</p>
      </Band>

      <Band id="more" label="Coverage and what comes next">
        <StoryBox
          className="lg:col-span-7"
          kicker="Coverage"
          title="What Novus Data watches"
          titleHref="/coverage"
          footer={<TextLink href="/coverage">Why each of these matters</TextLink>}
        >
          <ul className="grid max-w-none gap-x-8 sm:grid-cols-2">
            {coverageTopics.map((topic) => (
              <li key={topic.id} className="border-t border-hairline py-3">
                <span className="block font-medium text-fg">{topic.title}</span>
                <span className="mt-1 block text-[0.875rem]">{topic.summary}</span>
              </li>
            ))}
          </ul>
        </StoryBox>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <StoryBox
            kicker="In development"
            title={publication.alerts.name}
            titleHref="/alerts"
            footer={
              <>
                <TextLink href="/alerts">What it will and will not do</TextLink>
              </>
            }
          >
            <p>
              The register on your phone, and a notification when it changes: a new disruption
              opens, one you follow escalates, or a company you hold is added to a problem you are
              already watching. There is no release date yet, and subscribers to{' '}
              {publication.newsletter.name} hear first.
            </p>
          </StoryBox>

          <SubscribePanel level={3} heading={`Subscribe to ${publication.newsletter.name}`} />
        </div>
      </Band>

      {formatAuthorNames() ? (
        <Container className="mt-10">
          <p className="border-t border-hairline pt-5 text-meta text-muted">
            Novus Data is written by {formatAuthorNames()}.{' '}
            <TextLink href="/about">How it is produced</TextLink>.
          </p>
        </Container>
      ) : null}
    </>
  );
}

/**
 * The front page's name, set as a paper sets its nameplate: large, closed by
 * a double rule, with the strapline beneath. It is the page's h1.
 */
function Nameplate() {
  const authors = formatAuthorNames();

  return (
    <Container className="pt-8 sm:pt-12">
      <div className="border-b-[6px] border-double border-accent pb-3 sm:pb-4">
        <h1 className="text-[clamp(2.5rem,1.75rem+3.4vw,3.75rem)] font-bold leading-[0.95] tracking-[-0.04em] text-fg">
          {publication.name}
        </h1>
      </div>
      <div className="flex flex-col gap-1 border-b border-hairline py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <p className="text-[0.9375rem] text-muted">{publication.shortDescription}</p>
        <p className="text-meta text-muted">
          Free to read{authors ? <> &middot; Written by {authors}</> : null}
        </p>
      </div>
    </Container>
  );
}

/** A band of boxes opened by a section label. */
function Band({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Container className="mt-10 sm:mt-12">
      <section aria-labelledby={id}>
        <SectionLabel id={id}>{label}</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-12 [&>*]:min-w-0">
          {children}
        </div>
      </section>
    </Container>
  );
}

/** The case for the publication: the lead when nothing else is, a box when something is. */
function Explainer({ size, className }: { size: 'lead' | 'standard'; className?: string }) {
  return (
    <StoryBox
      size={size}
      level={2}
      className={className}
      kicker="Why Novus Data exists"
      title={publication.openingLine}
      deck={publication.openingBody}
      footer={
        size === 'lead' ? (
          <div className="flex flex-wrap gap-3 py-1">
            <ActionLink href="/disruptions">Open the register</ActionLink>
            <ActionLink href="/exposure" variant="quiet">
              See who it reaches
            </ActionLink>
          </div>
        ) : undefined
      }
    />
  );
}

/**
 * The most pressing open disruption leads, exactly as a front page leads with
 * its biggest story. It refreshes itself from the register with no hand-edit.
 */
function LeadDisruption({
  disruption,
  className,
}: {
  disruption: DisruptionSummary;
  className?: string;
}) {
  const updated = formatLongDate(disruption.updatedAt);

  return (
    <StoryBox
      size="lead"
      level={2}
      className={className}
      kicker={`Leading the register · ${CATEGORY_LABELS[disruption.category]}`}
      title={disruption.title}
      titleHref={`/disruptions/${disruption.id}`}
      deck={disruption.summary}
      footer={
        <>
          <StatusBadge status={disruption.status} />
          {updated ? (
            <span>
              Reviewed <time dateTime={disruption.updatedAt}>{updated}</time>
            </span>
          ) : null}
          <span className="flex basis-full flex-wrap gap-3 pt-1">
            <ActionLink href={`/disruptions/${disruption.id}`}>Read the analysis</ActionLink>
            {disruption.exposures.length > 0 ? (
              <ActionLink href="/exposure" variant="quiet">
                See who it reaches
              </ActionLink>
            ) : null}
          </span>
        </>
      }
    />
  );
}

/** Register empty but the briefing has shipped: lead with the latest issue. */
function LeadIssue({ issue, className }: { issue: IssueSummary; className?: string }) {
  const date = formatLongDate(issue.publishedAt);

  return (
    <StoryBox
      size="lead"
      level={2}
      className={className}
      kicker={`Latest briefing${formatIssueLabel(issue.issueNumber) ? ` · Issue ${formatIssueLabel(issue.issueNumber)}` : ''}`}
      title={issue.title}
      titleHref={`/briefings/${issue.slug}`}
      deck={issue.excerpt ?? undefined}
      footer={
        <>
          {date ? <time dateTime={issue.publishedAt}>{date}</time> : null}
          <span className="flex basis-full pt-1">
            <ActionLink href={`/briefings/${issue.slug}`}>Read this briefing</ActionLink>
          </span>
        </>
      }
    />
  );
}

function AlsoOpen({
  disruptions,
  className,
}: {
  disruptions: DisruptionSummary[];
  className?: string;
}) {
  return (
    <StoryBox
      className={className}
      kicker="Also open"
      title="Other entries in the register"
      footer={<TextLink href="/disruptions">The full register</TextLink>}
    >
      <ul className="story-list max-w-none">
        {disruptions.map((disruption) => (
          <li key={disruption.id} className="py-3 first:pt-0">
            <Link href={`/disruptions/${disruption.id}`} className="group block">
              <StatusBadge status={disruption.status} />
              <span className="mt-1 block text-[1.0625rem] font-semibold text-fg transition-colors group-hover:text-link">
                {disruption.title}
              </span>
              <span className="mt-1 block text-[0.9375rem]">{disruption.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </StoryBox>
  );
}

function MostExposed({ rows, className }: { rows: EntityExposure[]; className?: string }) {
  return (
    <StoryBox
      className={className}
      kicker="Most exposed"
      title="Names the open register reaches"
      footer={<TextLink href="/exposure">The full exposure chart</TextLink>}
    >
      <ul className="story-list max-w-none">
        {rows.map((row) => (
          <ExposureRow key={row.entity.id} row={row} />
        ))}
      </ul>
    </StoryBox>
  );
}

function ExposureRow({ row }: { row: EntityExposure }) {
  const asOf = [...row.byDisruption.values()]
    .map((exposure) => exposure.asOf)
    .sort()
    .at(-1);

  return (
    <li className="py-3 first:pt-0">
      <Link href={`/entities/${row.entity.id}`} className="group block">
        <span className="block text-[1.0625rem] text-fg transition-colors group-hover:text-link">
          {row.entity.name}
        </span>
        <span className="mt-0.5 block text-meta">
          {row.entity.ticker ? `${row.entity.ticker} · ` : ''}
          {row.entity.sector}
        </span>
        <span className="mt-1.5 flex items-center gap-2.5 text-meta">
          <SeveritySwatch severity={row.worstSeverity} />
          <span>
            {SEVERITY_LABELS[row.worstSeverity]} · <span data-numeric>{row.count}</span>{' '}
            {row.count === 1 ? 'disruption' : 'disruptions'}
            {asOf && formatShortDate(asOf) ? `, as of ${formatShortDate(asOf)}` : ''}
          </span>
        </span>
      </Link>
    </li>
  );
}

function LatestBriefing({ issue, className }: { issue: IssueSummary; className?: string }) {
  const date = formatLongDate(issue.publishedAt);
  const number = formatIssueLabel(issue.issueNumber);

  return (
    <StoryBox
      className={className}
      kicker={`From ${publication.newsletter.name}`}
      title={issue.title}
      titleHref={`/briefings/${issue.slug}`}
      footer={
        <>
          {number ? <span data-numeric>Issue {number}</span> : null}
          {date ? <time dateTime={issue.publishedAt}>{date}</time> : null}
          <TextLink href="/briefings">Every issue</TextLink>
        </>
      }
    >
      {issue.excerpt ? <p>{issue.excerpt}</p> : null}
    </StoryBox>
  );
}

function LatestAnalysis({ posts, className }: { posts: IssueSummary[]; className?: string }) {
  return (
    <StoryBox
      className={className}
      kicker="Latest analysis"
      title="Articles and long-term reviews"
      titleHref="/articles"
      footer={<TextLink href="/articles">All articles and reviews</TextLink>}
    >
      <ul className="story-list max-w-none">
        {posts.map((post) => (
          <li key={post.slug} className="py-3 first:pt-0">
            <Link href={`/articles/${post.slug}`} className="group block">
              {formatShortDate(post.publishedAt) ? (
                <time dateTime={post.publishedAt} className="block text-meta">
                  {formatShortDate(post.publishedAt)}
                </time>
              ) : null}
              <span className="mt-1 block text-[1.0625rem] font-semibold text-fg transition-colors group-hover:text-link">
                {post.title}
              </span>
              {post.excerpt ? (
                <span className="mt-1 block text-[0.9375rem]">{post.excerpt}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </StoryBox>
  );
}

/**
 * The register's own counts, as short lines for the box footers. Every figure
 * is counted from real records at build time. Null when the register is empty:
 * a row of zeroes would be accurate and useless.
 */
function registerCounts(disruptions: DisruptionSummary[], entityCount: number) {
  if (disruptions.length === 0) return null;

  const active = disruptions.filter((entry) => entry.status === 'active').length;
  const lastReviewed = disruptions
    .map((entry) => entry.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const reviewed = lastReviewed ? formatShortDate(lastReviewed) : null;

  return {
    register: (
      <>
        <span data-numeric>{disruptions.length}</span> tracked ·{' '}
        <span data-numeric>{active}</span> active
        {reviewed ? (
          <>
            {' '}
            · last reviewed <time dateTime={lastReviewed}>{reviewed}</time>
          </>
        ) : null}
      </>
    ),
    names: (
      <>
        <span data-numeric>{entityCount}</span>{' '}
        {entityCount === 1 ? 'name on the chart' : 'names on the chart'}
      </>
    ),
  };
}
