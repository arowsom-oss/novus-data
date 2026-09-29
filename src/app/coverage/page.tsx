import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { SubscribePanel } from '@/components/subscribe-panel';
import { TextLink } from '@/components/text-link';
import { coverageTopics } from '@/config/coverage';
import { publication } from '@/config/publication';
import { absoluteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Coverage',
  description: `The topics ${publication.name} tracks, and why each one matters.`,
  alternates: { canonical: absoluteUrl('/coverage') },
};

export default function CoveragePage() {
  return (
    <>
      <PageHeader
        width="reading"
        title="Coverage"
        lede="What Novus Data follows, why each of these matters, and what a briefing actually tells you about it."
      />

      <Container width="reading" className="mt-6">
        {/* A contents list, because seven topics is more than fits on a screen.
            The numbers are positions in a list, not decoration. */}
        <nav aria-label="Topics on this page" className="border-t border-hairline pt-5">
          <ol className="flex flex-col">
            {coverageTopics.map((topic, index) => (
              <li key={topic.id} className="flex items-center gap-4">
                <span data-numeric className="text-meta text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <TextLink standalone href={`#${topic.id}`} className="text-[0.9375rem]">
                  {topic.title}
                </TextLink>
              </li>
            ))}
          </ol>
        </nav>
      </Container>

      <Container width="reading" className="mt-16 flex flex-col gap-16">
        {coverageTopics.map((topic) => (
          <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-heading`}>
            <h2
              id={`${topic.id}-heading`}
              className="text-heading font-semibold text-fg"
            >
              {topic.title}
            </h2>

            <p className="mt-4 max-w-measure text-muted">{topic.definition}</p>

            <dl className="mt-7 flex flex-col gap-5 border-t border-hairline pt-5">
              <div>
                <dt className="text-meta text-muted">Why it matters to investors and analysts</dt>
                <dd className="mt-1.5 max-w-measure text-muted">{topic.whyItMatters.toInvestors}</dd>
              </div>
              <div>
                <dt className="text-meta text-muted">
                  Why it matters to procurement and operations
                </dt>
                <dd className="mt-1.5 max-w-measure text-muted">{topic.whyItMatters.toOperators}</dd>
              </div>
              <div>
                <dt className="text-meta text-muted">What Novus Data reports</dt>
                <dd className="mt-1.5 max-w-measure text-fg">{topic.whatIsReported}</dd>
              </div>
            </dl>
          </section>
        ))}
      </Container>

      <Container width="reading" className="mt-20">
        <SubscribePanel />
      </Container>
    </>
  );
}
