import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StoryBox } from '@/components/story-box';
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

      <Container width="reading" className="mt-8">
        {/* A contents list, because seven topics is more than fits on a screen.
            The numbers are positions in a list, not decoration. */}
        <nav aria-label="Topics on this page" className="story story-compact">
          <p className="kicker kicker-muted">On this page</p>
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

      <Container width="reading" className="mt-5 flex flex-col gap-5">
        {coverageTopics.map((topic, index) => (
          <StoryBox
            key={topic.id}
            as="section"
            level={2}
            id={topic.id}
            kicker={`Topic ${String(index + 1).padStart(2, '0')}`}
            kickerTone="muted"
            title={topic.title}
            deck={<p className="text-muted">{topic.definition}</p>}
            footer={
              <span>
                <span className="text-fg">What Novus Data reports: </span>
                {topic.whatIsReported}
              </span>
            }
          >
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="text-meta text-fg">Why it matters to investors and analysts</dt>
                <dd className="mt-1">{topic.whyItMatters.toInvestors}</dd>
              </div>
              <div>
                <dt className="text-meta text-fg">Why it matters to procurement and operations</dt>
                <dd className="mt-1">{topic.whyItMatters.toOperators}</dd>
              </div>
            </dl>
          </StoryBox>
        ))}
      </Container>

      <Container width="reading" className="mt-5">
        <SubscribePanel />
      </Container>
    </>
  );
}
