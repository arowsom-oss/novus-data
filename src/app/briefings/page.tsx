import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { IssueList } from '@/components/issue-list';
import { PageHeader } from '@/components/page-header';
import { SubscribePanel } from '@/components/subscribe-panel';
import { TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { GROUP_ARCHIVE_ABOVE, listIssues, listIssuesByYear } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Briefings',
  description: `Every issue of ${publication.name}, in reverse chronological order.`,
  alternates: { canonical: absoluteUrl('/briefings') },
};

export default async function BriefingsPage() {
  const issues = await listIssues();
  const grouped = issues.length > GROUP_ARCHIVE_ABOVE ? await listIssuesByYear() : null;

  return (
    <>
      <PageHeader
        title="Briefings"
        lede={
          issues.length > 0
            ? 'Every issue, newest first. The archive is held here in full, independently of where an issue was first sent.'
            : 'No issues have been published yet.'
        }
      />

      <Container className="mt-12 sm:mt-16">
        {issues.length === 0 ? (
          <EmptyArchive />
        ) : grouped ? (
          <div className="flex flex-col gap-14">
            {grouped.map((group) => (
              <section key={group.year} aria-labelledby={`year-${group.year}`}>
                <h2
                  id={`year-${group.year}`}
                  data-numeric
                  className="text-heading font-semibold text-fg"
                >
                  {group.year}
                </h2>
                <div className="mt-5">
                  <IssueList issues={group.issues} label={`Briefings from ${group.year}`} />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <IssueList issues={issues} label="All briefings" />
        )}
      </Container>

      {issues.length > 0 ? (
        <Container className="mt-20">
          <SubscribePanel heading="Get the next one by email" />
        </Container>
      ) : null}
    </>
  );
}

function EmptyArchive() {
  return (
    <div className="max-w-reading">
      <p className="text-muted">
        Nothing has been published yet, so there is nothing to archive. Once the first issue is
        out it appears here and stays here permanently.
      </p>
      <div className="mt-8 max-w-xl">
        <SubscribePanel heading="Subscribe before the first issue" />
      </div>
      <p className="mt-8">
        <TextLink href="/coverage">What Novus Data will cover</TextLink>
      </p>
    </div>
  );
}
