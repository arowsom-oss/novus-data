import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { ExposureChart } from '@/components/exposure-chart';
import { PageHeader } from '@/components/page-header';
import { StoryBox } from '@/components/story-box';
import { TextLink } from '@/components/text-link';
import { buildExposureMatrix } from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Exposure',
  description:
    'Which tracked supply chain disruptions reach which companies and sectors, with the mechanism, the confidence and the source behind every assessment.',
  alternates: { canonical: absoluteUrl('/exposure') },
};

export default async function ExposurePage() {
  const matrix = await buildExposureMatrix();

  return (
    <>
      <PageHeader
        title="Exposure"
        lede="Which tracked disruptions reach which companies, and how they reach them."
      />

      <Container className="mt-8">
        <StoryBox
          as="section"
          level={2}
          id="reading-the-chart"
          className="max-w-reading"
          kicker="Method"
          kickerTone="muted"
          title="A cell only exists if the claim behind it can be checked"
          footer={
            <>
              <TextLink href="/about#method">The full standard</TextLink>
              <TextLink href="/entities">Browse companies and sectors</TextLink>
              <span>Analysis, not investment advice, and not a recommendation about any security.</span>
            </>
          }
        >
          <p>
            Each cell is one assessment: a disruption from the register set against a company or
            sector. The fill is how hard it lands; the edge is how well established it is. Select
            a cell for the disruption behind it.
          </p>
          <p>
            The site refuses to render an assessment that does not state the mechanism, how
            confident it is, the date it was last true, and at least one source you can follow.
            That is enforced in code, not by editorial habit. Every name on the chart also has its
            own page, listing each disruption that reaches it and why.
          </p>
        </StoryBox>
      </Container>

      <Container className="mt-6">
        <ExposureChart matrix={matrix} />
      </Container>

      <Container className="mt-6">
        <StoryBox
          as="aside"
          size="compact"
          level={2}
          className="max-w-reading"
          kicker="Corrections"
          kickerTone="muted"
          title="Disagree with an assessment, or know of one that is missing?"
          footer={<TextLink href="/contact">Send it with a source</TextLink>}
        >
          <p>Corrections are the most useful thing you can send.</p>
        </StoryBox>
      </Container>
    </>
  );
}
