import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StoryBox } from '@/components/story-box';
import { MailLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { absoluteUrl, env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Contact',
  description: `How to reach ${publication.name}.`,
  alternates: { canonical: absoluteUrl('/contact') },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader width="reading" title="Contact" />

      <Container width="reading" className="mt-8">
        {/* No form. There is no backend to receive one, and a form that
            silently discards messages is worse than an address. */}
        <StoryBox as="section" level={2} id="write" kicker="Write in" kickerTone="muted" title="By email">
          {env.contactEmail ? (
            <>
              <p className="text-subhead">
                <MailLink email={env.contactEmail} />
              </p>
              <p>
                Corrections, sources, questions about something in an issue, and requests to cover
                a particular lane or policy are all welcome. Corrections get read first.
              </p>
            </>
          ) : (
            <p>No contact address is published yet. Set NEXT_PUBLIC_CONTACT_EMAIL to add one.</p>
          )}
        </StoryBox>
      </Container>
    </>
  );
}
