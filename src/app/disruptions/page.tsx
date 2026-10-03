import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { StoryBox } from '@/components/story-box';
import { TextLink } from '@/components/text-link';
import { CATEGORY_LABELS, isStale, listDisruptions } from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';
import { formatShortDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Disruptions',
  description:
    'The register of tracked supply chain disruptions: what is going wrong, where, how far along it is, and when each entry was last reviewed.',
  alternates: { canonical: absoluteUrl('/disruptions') },
};

export default async function DisruptionsPage() {
  const disruptions = await listDisruptions();

  return (
    <>
      <PageHeader
        title="Disruptions"
        lede="The register: what is going wrong in physical trade right now, and how far along each problem is."
      />

      <Container className="mt-8">
        {disruptions.length === 0 ? (
          <EmptyRegister />
        ) : (
          // One boxed story per entry: the category is the kicker, and the
          // status, review date and counts sit in the footer where a paper
          // puts a story's dateline.
          <ul className="grid gap-4 lg:grid-cols-2">
            {disruptions.map((disruption) => {
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

      {disruptions.length > 0 ? (
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
