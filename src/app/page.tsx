import clsx from 'clsx';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { ActionLink } from '@/components/action';
import { Container } from '@/components/container';
import { IssueList } from '@/components/issue-list';
import { JsonLd } from '@/components/json-ld';
import { NeedsInput } from '@/components/needs-input';
import { SeveritySwatch } from '@/components/severity-legend';
import { StatusBadge } from '@/components/status-badge';
import { SignInPanel } from '@/components/sign-in-panel';
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

  return (
    <>
      <JsonLd data={publicationJsonLd()} />

      <Opening />

      <RegisterPulse disruptions={disruptions} entityCount={matrix.rows.length} />

      <Mission />

      <WhatWeDo />

      <TheApp />

      <WhoItIsFor />

      {lead ? (
        <LeadDisruption disruption={lead} />
      ) : latestIssue ? (
        <LeadIssue issue={latestIssue} />
      ) : null}

      {rest.length > 0 ? (
        <Container className="mt-12 sm:mt-16">
          <SectionHeading id="open">Also open</SectionHeading>
          <ul className="mt-6 border-b border-hairline">
            {rest.slice(0, 5).map((disruption) => (
              <li key={disruption.id} className="border-t border-hairline">
                <Link
                  href={`/disruptions/${disruption.id}`}
                  className="group grid gap-x-8 gap-y-2 px-2 py-5 transition-colors hover:bg-surface sm:grid-cols-[9rem_1fr] sm:px-3"
                >
                  <StatusBadge status={disruption.status} />
                  <div>
                    <h3 className="text-[1.1875rem] font-semibold text-fg transition-colors group-hover:text-link">
                      {disruption.title}
                    </h3>
                    <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] text-muted">
                      {disruption.summary}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <TextLink standalone href="/disruptions">
              The full register
            </TextLink>
          </p>
        </Container>
      ) : null}

      {matrix.rows.length > 0 ? (
        <Container className="mt-12 sm:mt-16">
          <SectionHeading id="exposure">Most exposed</SectionHeading>
          <p className="mt-3 max-w-measure text-muted">
            Companies and sectors that the open register currently reaches. Every assessment
            behind this states its mechanism and its source.
          </p>
          <ul className="mt-6 border-b border-hairline">
            {matrix.rows.slice(0, 6).map((row) => (
              <ExposureRow key={row.entity.id} row={row} />
            ))}
          </ul>
          <p className="mt-3">
            <TextLink standalone href="/exposure">
              The full exposure chart
            </TextLink>
          </p>
        </Container>
      ) : null}

      {latestIssue && lead ? (
        <Container className="mt-12 sm:mt-16">
          <SectionHeading id="briefing">From {publication.newsletter.name}</SectionHeading>
          <p className="mt-3 max-w-measure text-muted">{publication.newsletter.description}</p>
          <div className="mt-6 border-t border-hairline pt-6">
            <p className="flex flex-wrap gap-x-8 gap-y-1 text-meta text-muted">
              {formatIssueLabel(latestIssue.issueNumber) ? (
                <span data-numeric>Issue {formatIssueLabel(latestIssue.issueNumber)}</span>
              ) : null}
              {formatLongDate(latestIssue.publishedAt) ? (
                <time dateTime={latestIssue.publishedAt}>
                  {formatLongDate(latestIssue.publishedAt)}
                </time>
              ) : null}
            </p>
            <h3 className="mt-3 max-w-[24ch] text-heading font-semibold text-fg">
              <Link
                href={`/briefings/${latestIssue.slug}`}
                className="transition-colors hover:text-link"
              >
                {latestIssue.title}
              </Link>
            </h3>
            {latestIssue.excerpt ? (
              <p className="mt-3 max-w-[62ch] text-muted">{latestIssue.excerpt}</p>
            ) : null}
          </div>
          <p className="mt-3">
            <TextLink standalone href="/briefings">
              Every issue
            </TextLink>
          </p>
        </Container>
      ) : null}

      {/* Only once something is published: an empty "latest analysis" block
          is a promise, and this page makes none. */}
      {analysis.length > 0 ? (
        <Container className="mt-12 sm:mt-16">
          <SectionHeading id="analysis">Latest analysis</SectionHeading>
          <div className="mt-6">
            <IssueList issues={analysis} label="Latest articles and reviews" basePath="/articles" />
          </div>
          <p className="mt-3">
            <TextLink standalone href="/articles">
              All articles and long-term reviews
            </TextLink>
          </p>
        </Container>
      ) : null}

      <Container className="mt-12 sm:mt-16">
        <SectionHeading id="coverage">What Novus Data watches</SectionHeading>
        <dl className="mt-6 grid gap-x-14 md:grid-cols-2">
          {coverageTopics.map((topic) => (
            <div key={topic.id} className="border-t border-hairline py-5">
              <dt className="text-[1.1875rem] font-semibold text-fg">{topic.title}</dt>
              <dd className="mt-1.5 max-w-[52ch] text-[0.9375rem] text-muted">{topic.summary}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3">
          <TextLink standalone href="/coverage">
            Why each of these matters
          </TextLink>
        </p>
      </Container>

      <Container className="mt-12 sm:mt-16">
        {/* min-w-0 on the children: a grid item defaults to min-width:auto and
            will not shrink below its longest unbreakable word otherwise. */}
        <div className="grid gap-8 md:grid-cols-2 [&>*]:min-w-0">
          <SubscribePanel heading={`Subscribe to ${publication.newsletter.name}`} />
          <section className="border border-hairline bg-surface p-7 sm:p-10">
            <h2 className="text-heading font-semibold text-fg">
              {publication.alerts.name}
            </h2>
            <p className="mt-3 max-w-[52ch] text-muted">
              Notifications when the register changes. Not built yet.
            </p>
            <p className="mt-3">
              <TextLink standalone href="/alerts">
                What it will and will not do
              </TextLink>
            </p>
          </section>
        </div>
      </Container>

      <Container className="mt-16">
        <p className="max-w-[56ch] text-muted">
          {formatAuthorNames() ? (
            <>Novus Data is written by {formatAuthorNames()}. </>
          ) : (
            <>
              Novus Data is written by <NeedsInput label="author name" />.{' '}
            </>
          )}
          <TextLink href="/about">How it is produced</TextLink>.
        </p>
      </Container>
    </>
  );
}

/**
 * The lead story is the most pressing open disruption, exactly as a news front
 * page leads with its biggest story. It refreshes itself from the register with
 * no hand-edit.
 */
function LeadDisruption({ disruption }: { disruption: DisruptionSummary }) {
  const updated = formatLongDate(disruption.updatedAt);

  return (
    <Container className="mt-12 sm:mt-16">
      <SectionHeading id="latest">Leading the register</SectionHeading>
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-meta text-muted">
        <StatusBadge status={disruption.status} />
        <span>{CATEGORY_LABELS[disruption.category]}</span>
        {updated ? (
          <span>
            Reviewed <time dateTime={disruption.updatedAt}>{updated}</time>
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 max-w-[20ch] text-title font-semibold text-fg">
        {disruption.title}
      </h3>

      <p className="mt-5 max-w-[58ch] text-subhead text-muted">{disruption.summary}</p>

      <div className="mt-7 flex flex-wrap gap-4">
        <ActionLink href={`/disruptions/${disruption.id}`}>Read the analysis</ActionLink>
        {disruption.exposures.length > 0 ? (
          <ActionLink href="/exposure" variant="quiet">
            See who it reaches
          </ActionLink>
        ) : null}
      </div>
    </Container>
  );
}

/** Register empty but the briefing has shipped — lead with the latest issue. */
function LeadIssue({ issue }: { issue: IssueSummary }) {
  const date = formatLongDate(issue.publishedAt);

  return (
    <Container className="mt-12 sm:mt-16">
      <SectionHeading id="latest">Latest briefing</SectionHeading>
      <p className="mt-6 text-meta text-muted">
        {date ? <time dateTime={issue.publishedAt}>{date}</time> : null}
      </p>

      <h3 className="mt-3 max-w-[20ch] text-title font-semibold text-fg">
        {issue.title}
      </h3>

      {issue.excerpt ? (
        <p className="mt-5 max-w-[58ch] text-subhead text-muted">{issue.excerpt}</p>
      ) : null}

      <div className="mt-7">
        <ActionLink href={`/briefings/${issue.slug}`}>Read this briefing</ActionLink>
      </div>
    </Container>
  );
}

/**
 * The page opener: what Novus Data is, and the account panel.
 *
 * The sign-in is a shell with nothing behind it — see SignInPanel. It leads
 * because that is where the product is going, not because it works today.
 */
function Opening() {
  return (
    <Container className="relative isolate pt-10 sm:pt-14">
      {/* Decorative gridlines. See .grid-field in globals.css — no image, no
          motion, and it disappears under forced colours and prefers-contrast. */}
      <div className="grid-field" aria-hidden="true" />

      <div className="relative grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16 [&>*]:min-w-0">
        <div>
          {/* A masthead line rather than a bare repeat of the header wordmark:
              the name earns its place here by carrying the descriptor. */}
          <p className="flex flex-col gap-1 border-b-2 border-accent pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="text-[1.375rem] font-semibold tracking-[-0.012em] text-fg">
              {publication.name}
            </span>
            <span className="text-meta text-muted">{publication.shortDescription}</span>
          </p>

          <h1 className="mt-8 max-w-[15ch] text-display font-semibold text-fg">
            {publication.openingLine}
          </h1>

          <p className="mt-7 max-w-[58ch] text-subhead text-muted">{publication.openingBody}</p>

          <div className="mt-9 flex flex-wrap gap-4">
            <ActionLink href="/disruptions">See what is going wrong</ActionLink>
            <ActionLink href="/exposure" variant="quiet">
              See who it reaches
            </ActionLink>
          </div>
        </div>

        <div className="lg:pt-14">
          <SignInPanel enabled={accountsConfigured()} />
        </div>
      </div>
    </Container>
  );
}

/**
 * A count of what is actually in the register, directly under the hero.
 *
 * Every figure here is derived from real records at build time — the number of
 * files in content/disruptions/, how many of them are active, how many distinct
 * entities the exposure chart resolves, and the most recent review date across
 * all of them. Nothing is rounded, projected or dressed up, and there are no
 * counters that animate on scroll.
 *
 * **It renders nothing at all when the register is empty.** A row of zeroes
 * would be an accurate but useless first impression, and per Rule 1 an empty
 * page beats an invented one.
 */
function RegisterPulse({
  disruptions,
  entityCount,
}: {
  disruptions: DisruptionSummary[];
  entityCount: number;
}) {
  if (disruptions.length === 0) return null;

  const active = disruptions.filter((entry) => entry.status === 'active').length;
  const lastReviewed = disruptions
    .map((entry) => entry.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const stats: { label: string; value: string; href?: string; date?: boolean }[] = [
    {
      label: disruptions.length === 1 ? 'Disruption tracked' : 'Disruptions tracked',
      value: String(disruptions.length),
      href: '/disruptions',
    },
    { label: 'Active now', value: String(active) },
    {
      label: entityCount === 1 ? 'Name on the chart' : 'Names on the chart',
      value: String(entityCount),
      href: '/exposure',
    },
  ];

  // The date is set smaller than the counts on purpose: at the same size it is
  // four times the width of a single digit and unbalances the row.
  const reviewed = lastReviewed ? formatShortDate(lastReviewed) : null;
  if (reviewed) stats.push({ label: 'Last reviewed', value: reviewed, date: true });

  return (
    <Container className="mt-12 sm:mt-16">
      <dl className="grid grid-cols-2 gap-px border-y border-hairline bg-hairline sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="relative min-w-0 bg-ink px-1 py-5 sm:px-2">
            <dt className="text-meta text-muted">
              {stat.href ? (
                // A stretched link: the anchor stays inside the <dt> so the
                // <dl> content model holds, but `after:inset-0` makes the whole
                // cell the target rather than a 16px line of label text.
                <TextLink href={stat.href} className="text-meta after:absolute after:inset-0 after:content-['']">
                  {stat.label}
                </TextLink>
              ) : (
                stat.label
              )}
            </dt>
            <dd
              className={clsx(
                'mt-2 font-semibold leading-none text-fg',
                stat.date ? 'text-[1.125rem] leading-snug' : 'text-[1.75rem]',
              )}
              data-numeric
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

function Mission() {
  return (
    <Container className="mt-12 sm:mt-16">
      <div className="max-w-reading section-rule">
        <p className="kicker kicker-muted">Our mission</p>
        <p className="mt-4 text-title font-semibold text-fg">{publication.mission}</p>
      </div>
    </Container>
  );
}

/**
 * What the site actually is. Deliberately a typographic list rather than a row
 * of icon cards — every item here is a thing that exists and can be opened.
 */
function WhatWeDo() {
  const pillars = [
    {
      href: '/disruptions',
      title: 'The register',
      body: 'A live record of what is going wrong in physical trade — chokepoints, ports, trade policy, industrial inputs, energy and labour. Each entry carries the date it was last reviewed, so you are never reading a month-old assessment as though it were today.',
      cta: 'Open the register',
    },
    {
      href: '/exposure',
      title: 'The exposure chart',
      body: 'The part nobody else does. Every tracked problem is mapped to the companies and sectors it reaches, with the mechanism written out — not "affected", but how. A claim without a mechanism, a confidence level, a date and a source cannot appear on the chart at all. That is enforced in code.',
      cta: 'Open the chart',
    },
    {
      // A link, not a live panel. Reading the feeds here would put the home
      // page on the fifteen-minute regeneration cycle too, doubling the calls
      // to every publisher for a preview of a page one click away.
      href: '/monitor',
      title: 'The monitor',
      body: 'Public feeds, re-read every fifteen minutes: where reporting of strikes, blockades, sanctions and fighting is running above its normal, flags at ports and straits, ships at ten chokepoints, hazards, port wind and energy prices. Every reading shows when its source produced it.',
      cta: 'Open the monitor',
    },
    {
      href: '/briefings',
      title: 'The briefing',
      body: `${publication.newsletter.name} pulls the week together in writing and sends it by email — what moved, what it is likely to reach next, and what is worth ignoring.`,
      cta: 'Read the archive',
    },
  ];

  return (
    <Container className="mt-12 sm:mt-16">
      <SectionHeading id="what-we-do">What we do at Novus Data</SectionHeading>
      <p className="mt-4 max-w-measure text-muted">
        Four things, and they feed each other. The register records the problem, the chart says
        who it lands on, the monitor shows what is moving now, and the briefing explains what it
        means.
      </p>

      {/* One link per pillar, wrapping the whole card: a larger target than a
          trailing text link, and the rule at the top carries the hover so the
          columns read as a row rather than loose paragraphs. Two by two until
          there is room for four across, because four at tablet width leaves
          each column about twenty characters wide. */}
      <div className="mt-8 grid gap-x-10 md:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => (
          <Link
            key={pillar.href}
            href={pillar.href}
            className="group flex flex-col border-t-2 border-hairline py-6 transition-colors hover:border-accent focus-visible:border-accent"
          >
            <h3 className="text-[1.1875rem] font-semibold text-fg transition-colors group-hover:text-link">
              {pillar.title}
            </h3>
            <p className="mt-2.5 text-[0.9375rem] text-muted">{pillar.body}</p>
            {/* mt-auto pins the three calls to action to a common baseline even
                though the paragraphs above them are different lengths. */}
            <p className="mt-auto pt-4 text-[0.9375rem] text-link underline decoration-link/35 underline-offset-4 transition-colors group-hover:decoration-link">
              {pillar.cta}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}

/**
 * The app is not built. The copy is written in the future tense throughout and
 * points at the briefing, which is the channel that exists today.
 */
function TheApp() {
  return (
    <Container className="mt-12 sm:mt-16">
      <div className="border border-hairline bg-surface p-7 sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:gap-14 [&>*]:min-w-0">
          <div>
            <p className="kicker">In development</p>
            <h2 className="mt-3 text-heading font-semibold text-fg">
              {publication.alerts.name}
            </h2>
            <p className="mt-4 max-w-measure text-muted">
              The register on your phone, and a notification when it changes — a new disruption
              opens, one you follow escalates, or a company you hold is added to a problem you
              are already watching. You find out when it happens rather than when you next think
              to look.
            </p>
            <p className="mt-4 max-w-measure text-muted">
              It is being built now and there is no release date worth announcing yet. Subscribers
              to {publication.newsletter.name} hear first.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <ActionLink href="/alerts">What the app will do</ActionLink>
            <ActionLink href="/subscribe" variant="quiet">
              Get told when it lands
            </ActionLink>
          </div>
        </div>
      </div>
    </Container>
  );
}

/** Two audiences, two different reasons. Stated separately because they differ. */
function WhoItIsFor() {
  return (
    <Container className="mt-12 sm:mt-16">
      <SectionHeading id="who-for">Why it is worth your time</SectionHeading>

      <div className="mt-8 grid gap-x-16 gap-y-10 md:grid-cols-2 [&>*]:min-w-0">
        <div className="border-t border-hairline pt-6">
          <h3 className="text-[1.1875rem] font-semibold text-fg">
            If you invest
          </h3>
          <div className="mt-3 flex flex-col gap-3 text-muted">
            <p>
              Physical trade breaks before prices move. A chokepoint closing absorbs vessel
              capacity across a whole market, not one route; a licence on one processed metal can
              reprice a sector that looked diversified. The gap between the event and the
              repricing is the only part you can act in.
            </p>
            <p>
              The exposure chart is built to close that gap honestly. It tells you which names sit
              downstream of a problem and, crucially, how strong the evidence is — reported,
              inferred or estimated — so you can size your conviction to ours.
            </p>
          </div>
        </div>

        <div className="border-t border-hairline pt-6">
          <h3 className="text-[1.1875rem] font-semibold text-fg">
            If you run a business
          </h3>
          <div className="mt-3 flex flex-col gap-3 text-muted">
            <p>
              A rerouting adds weeks to transit time, which changes safety stock, working capital
              and every promise you have made downstream — and the decision usually has to be
              taken before the disruption is confirmed.
            </p>
            <p>
              The register gives you the problem with its date and its sources attached, so you
              can judge it yourself rather than act on a headline. Where your suppliers or your
              own category appear on the chart, the mechanism is written out, which is what makes
              it usable in a conversation with a board or a customer.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-measure text-meta text-muted">
        Novus Data publishes analysis and commentary. It is not investment advice, and nothing
        here is a recommendation to buy or sell any security.
      </p>
    </Container>
  );
}

function ExposureRow({ row }: { row: EntityExposure }) {
  const asOf = [...row.byDisruption.values()]
    .map((exposure) => exposure.asOf)
    .sort()
    .at(-1);

  return (
    <li className="border-t border-hairline">
      <Link
        href={`/entities/${row.entity.id}`}
        className="group grid gap-x-6 gap-y-1 px-2 py-4 transition-colors hover:bg-surface sm:grid-cols-[1fr_auto] sm:px-3"
      >
        <div>
          <span className="block text-[1.0625rem] text-fg transition-colors group-hover:text-link">
            {row.entity.name}
          </span>
          <span className="mt-0.5 block text-meta text-muted">
            {row.entity.ticker ? `${row.entity.ticker} · ` : ''}
            {row.entity.sector}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <SeveritySwatch severity={row.worstSeverity} />
          <span className="text-meta text-muted">
            {SEVERITY_LABELS[row.worstSeverity]} ·{' '}
            <span data-numeric>{row.count}</span>{' '}
            {row.count === 1 ? 'disruption' : 'disruptions'}
            {asOf && formatShortDate(asOf) ? `, as of ${formatShortDate(asOf)}` : ''}
          </span>
        </div>
      </Link>
    </li>
  );
}

function SectionHeading({ children, id }: { children: ReactNode; id: string }) {
  return (
    <h2 id={id} className="text-heading font-semibold text-fg">
      {children}
    </h2>
  );
}
