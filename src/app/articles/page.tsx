import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { IssueList } from '@/components/issue-list';
import { PageHeader } from '@/components/page-header';
import { SubscribePanel } from '@/components/subscribe-panel';
import { TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { listArticles } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Articles',
  description: `Analysis from ${publication.name}: articles on what is moving now, and long-term reviews that step back over months.`,
  alternates: { canonical: absoluteUrl('/articles') },
};

/**
 * Articles and long-term reviews — writing for the site, as distinct from the
 * emailed briefing.
 *
 * Both are published from Beehiiv and filed by their tags (see KIND_TAGS in
 * src/lib/content/types.ts), so this page needs no editing when one is added:
 * sync, and it appears. Reviews lead, because they are the long view a reader
 * cannot get from the monitor or the register; articles follow, newest first.
 *
 * Empty is a real state. The page says there is nothing yet rather than
 * showing a placeholder — Rule 1 forbids fake titles anywhere that could
 * reach production.
 */
export default async function ArticlesPage() {
  const [reviews, articles] = await Promise.all([listArticles('review'), listArticles('article')]);
  const empty = reviews.length === 0 && articles.length === 0;

  return (
    <>
      <PageHeader
        title="Articles"
        lede="Analysis written for the site: long-term reviews that step back over months, and shorter articles on what is moving now."
      />

      <Container className="mt-10 sm:mt-12">
        {empty ? (
          <div className="max-w-reading">
            <p className="text-muted">
              Nothing has been published here yet. The first articles will appear on this page and
              stay here permanently; until then, the{' '}
              <TextLink href="/monitor">monitor</TextLink> and the{' '}
              <TextLink href="/disruptions">register</TextLink> are where the current picture is.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            <section aria-labelledby="reviews-heading" className="section-rule">
              <h2 id="reviews-heading" className="text-heading font-semibold text-fg">
                Long-term reviews
              </h2>
              <p className="mt-2 max-w-[64ch] text-[0.9375rem] text-muted">
                What changed over a quarter or a half-year, what lasted and what faded — read against
                the register&rsquo;s own record rather than the week&rsquo;s headlines.
              </p>
              <div className="mt-5">
                {reviews.length > 0 ? (
                  <IssueList issues={reviews} label="Long-term reviews" basePath="/articles" />
                ) : (
                  <p className="text-muted">No long-term review has been published yet.</p>
                )}
              </div>
            </section>

            <section aria-labelledby="articles-heading" className="section-rule">
              <h2 id="articles-heading" className="text-heading font-semibold text-fg">
                Articles
              </h2>
              <div className="mt-5">
                {articles.length > 0 ? (
                  <IssueList issues={articles} label="Articles" basePath="/articles" />
                ) : (
                  <p className="text-muted">No article has been published yet.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Container>

      <Container className="mt-20">
        <SubscribePanel heading="Get the briefing by email" />
      </Container>
    </>
  );
}
