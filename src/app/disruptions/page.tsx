import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { StoryBox } from '@/components/story-box';
import { TextLink } from '@/components/text-link';
import {
  CATEGORY_LABELS,
  DISRUPTION_CATEGORIES,
  DISRUPTION_STATUSES,
  isStale,
  listDisruptions,
  STATUS_LABELS,
} from '@/lib/disruptions';
import type { DisruptionCategory, DisruptionStatus } from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';
import { formatShortDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Disruptions',
  description:
    'The register of tracked supply chain disruptions: what is going wrong, where, how far along it is, and when each entry was last reviewed.',
  alternates: { canonical: absoluteUrl('/disruptions') },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function isDisruptionStatus(value: string): value is DisruptionStatus {
  return DISRUPTION_STATUSES.includes(value as DisruptionStatus);
}

function isDisruptionCategory(value: string): value is DisruptionCategory {
  return DISRUPTION_CATEGORIES.includes(value as DisruptionCategory);
}

export default async function DisruptionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const disruptions = await listDisruptions();
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q).trim();
  const statusParam = firstParam(params.status);
  const categoryParam = firstParam(params.category);
  const freshness = firstParam(params.freshness);
  const status = isDisruptionStatus(statusParam) ? statusParam : '';
  const category = isDisruptionCategory(categoryParam) ? categoryParam : '';
  const filteredDisruptions = disruptions.filter((disruption) => {
    const exposureNames = disruption.exposures
      .map(({ entity }) => `${entity.name} ${entity.sector}`)
      .join(' ');
    const haystack = `${disruption.title} ${disruption.summary} ${CATEGORY_LABELS[disruption.category]} ${exposureNames}`.toLowerCase();
    const matchesQuery = query.length === 0 || haystack.includes(query.toLowerCase());
    const matchesStatus = status.length === 0 || disruption.status === status;
    const matchesCategory = category.length === 0 || disruption.category === category;
    const matchesFreshness =
      freshness === 'stale'
        ? isStale(disruption.updatedAt)
        : freshness === 'current'
          ? !isStale(disruption.updatedAt)
          : true;
    return matchesQuery && matchesStatus && matchesCategory && matchesFreshness;
  });

  return (
    <>
      <PageHeader
        title="Disruptions"
        lede="The register: what is going wrong in physical trade right now, and how far along each problem is."
      />

      <Container className="mt-8">
        {disruptions.length > 0 ? (
          <RegisterFilters
            query={query}
            status={status}
            category={category}
            freshness={freshness}
            resultCount={filteredDisruptions.length}
            totalCount={disruptions.length}
          />
        ) : null}

        {disruptions.length === 0 ? (
          <EmptyRegister />
        ) : filteredDisruptions.length === 0 ? (
          <NoMatches />
        ) : (
          // One boxed story per entry: the category is the kicker, and the
          // status, review date and counts sit in the footer where a paper
          // puts a story's dateline.
          <ul className="grid gap-4 lg:grid-cols-2">
            {filteredDisruptions.map((disruption) => {
              const updated = formatShortDate(disruption.updatedAt);
              const stale = isStale(disruption.updatedAt);

              return (
                <li key={disruption.id} className="flex min-w-0">
                  <StoryBox
                    className="w-full"
                    level={2}
                    kicker={CATEGORY_LABELS[disruption.category]}
                    kickerTone="muted"
                    title={disruption.title}
                    titleHref={`/disruptions/${disruption.id}`}
                    footer={
                      <>
                        <StatusBadge status={disruption.status} />
                        {updated ? (
                          <span>
                            Reviewed <time dateTime={disruption.updatedAt}>{updated}</time>
                            {stale ? ', not reviewed recently' : ''}
                          </span>
                        ) : null}
                        <span data-numeric>
                          {disruption.exposures.length}{' '}
                          {disruption.exposures.length === 1 ? 'name affected' : 'names affected'}
                        </span>
                        <span data-numeric>
                          {disruption.sources.length}{' '}
                          {disruption.sources.length === 1 ? 'source' : 'sources'}
                        </span>
                      </>
                    }
                  >
                    <p>{disruption.summary}</p>
                  </StoryBox>
                </li>
              );
            })}
          </ul>
        )}
      </Container>

      {filteredDisruptions.length > 0 ? (
        <Container className="mt-6">
          <p className="max-w-measure text-muted">
            <TextLink href="/exposure">See all of this as one chart</TextLink>: every tracked
            problem against every company it reaches.
          </p>
        </Container>
      ) : null}
    </>
  );
}

function RegisterFilters({
  query,
  status,
  category,
  freshness,
  resultCount,
  totalCount,
}: {
  query: string;
  status: DisruptionStatus | '';
  category: DisruptionCategory | '';
  freshness: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <form method="get" className="mb-6 border-y border-hairline py-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:items-end">
        <label className="flex flex-col gap-2 text-meta text-muted">
          Search the register
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Title or summary"
            className="min-h-11 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg placeholder:text-muted/70"
          />
        </label>

        <label className="flex flex-col gap-2 text-meta text-muted">
          Status
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg"
          >
            <option value="">All statuses</option>
            {DISRUPTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-meta text-muted">
          Category
          <select
            name="category"
            defaultValue={category}
            className="min-h-11 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg"
          >
            <option value="">All categories</option>
            {DISRUPTION_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-meta text-muted">
          Review date
          <select
            name="freshness"
            defaultValue={freshness}
            className="min-h-11 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg"
          >
            <option value="">Any review date</option>
            <option value="current">Reviewed recently</option>
            <option value="stale">Needs review</option>
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center border border-accent bg-surface-2 px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link"
        >
          Filter
        </button>
      </div>
      <p className="mt-4 text-meta text-muted" aria-live="polite">
        Showing {resultCount} of {totalCount} {totalCount === 1 ? 'entry' : 'entries'}.
        {resultCount !== totalCount ? (
          <Link href="/disruptions" className="ml-2 text-link underline underline-offset-2">
            Clear filters
          </Link>
        ) : null}
      </p>
    </form>
  );
}

function NoMatches() {
  return (
    <StoryBox
      as="section"
      level={2}
      className="max-w-reading"
      kicker="The register"
      kickerTone="muted"
      title="No entries match those filters"
    >
      <p>Try a broader search or clear the filters to see the full register.</p>
    </StoryBox>
  );
}

function EmptyRegister() {
  return (
    <StoryBox
      as="section"
      level={2}
      className="max-w-reading"
      kicker="The register"
      kickerTone="muted"
      title="Nothing is in the register yet"
      footer={<TextLink href="/coverage">What Novus Data watches for</TextLink>}
    >
      <p>
        Entries appear here as disruptions are tracked. Each one carries the date it was last
        reviewed, the companies and sectors it reaches, and the sources behind every claim.
      </p>
    </StoryBox>
  );
}
