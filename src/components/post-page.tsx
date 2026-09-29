import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/container';
import { JsonLd } from '@/components/json-ld';
import { PrintPermalink } from '@/components/print-permalink';
import { ProseBody } from '@/components/prose-body';
import { SubscribePanel } from '@/components/subscribe-panel';
import { ExternalLink, TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { POST_KIND_LABELS, postPath, type Issue, type IssueNeighbours, type IssueSummary } from '@/lib/content/types';
import { absoluteUrl } from '@/lib/env';
import { formatIssueLabel, formatLongDate, readingTimeMinutes, toDate } from '@/lib/format';
import { issueJsonLd } from '@/lib/structured-data';

/**
 * The reading page for every post — a briefing at /briefings/[slug], an
 * article or long-term review at /articles/[slug]. One page, so the measure,
 * type and print behaviour cannot drift between them. A briefing shows its
 * issue number; an article or review names its kind above the title instead,
 * because those are not numbered.
 */

/**
 * The newsletter is published by email first, so where a post exists on the
 * sending platform that copy is canonical. Where it does not — a hand-written
 * post, or anything published after leaving Beehiiv — this page is canonical.
 */
function canonicalFor(post: IssueSummary): string {
  return post.externalUrl ?? absoluteUrl(postPath(post));
}

export function postMetadata(post: Issue): Metadata {
  const description = post.excerpt ?? publication.description;
  return {
    title: post.title,
    description,
    alternates: { canonical: canonicalFor(post) },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: absoluteUrl(postPath(post)),
      publishedTime: toDate(post.publishedAt)?.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  };
}

export function PostPage({ post, previous, next }: { post: Issue } & IssueNeighbours) {
  const briefing = post.kind === 'briefing';
  const kindLabel = POST_KIND_LABELS[post.kind];
  const kind = kindLabel.toLowerCase();
  const date = formatLongDate(post.publishedAt);
  const number = briefing ? formatIssueLabel(post.issueNumber) : null;
  // A real measurement of the stored text. Omitted entirely when there is no
  // body to measure, rather than defaulted to something.
  const minutes = readingTimeMinutes(post.contentHtml);

  return (
    <article>
      <JsonLd data={issueJsonLd(post, canonicalFor(post))} />

      <Container width="reading" className="pt-10 sm:pt-14">
        <p className="text-meta text-muted">
          <TextLink href={briefing ? '/briefings' : '/articles'} className="no-underline hover:underline">
            {briefing ? 'Briefings' : 'Articles'}
          </TextLink>
        </p>

        {briefing ? (
          <h1 className="mt-6 text-title font-semibold text-fg">{post.title}</h1>
        ) : (
          <>
            <p className="kicker mt-6">{kindLabel}</p>
            <h1 className="mt-2 text-title font-semibold text-fg">{post.title}</h1>
          </>
        )}

        {post.excerpt ? (
          <p className="mt-6 max-w-measure text-subhead text-muted">{post.excerpt}</p>
        ) : null}

        {/* A rule here divides the metadata from the body — it is dividing two
            real things, which is the only reason this site draws a rule. */}
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-3 border-t border-hairline pt-5 text-meta">
          {number ? (
            <div>
              <dt className="text-muted">Issue</dt>
              <dd data-numeric className="mt-0.5 text-fg">
                {number}
              </dd>
            </div>
          ) : null}
          {date ? (
            <div>
              <dt className="text-muted">Published</dt>
              <dd className="mt-0.5 text-fg">
                <time dateTime={post.publishedAt}>{date}</time>
              </dd>
            </div>
          ) : null}
          {minutes !== null ? (
            <div>
              <dt className="text-muted">Reading time</dt>
              <dd data-numeric className="mt-0.5 text-fg">
                {minutes} min
              </dd>
            </div>
          ) : null}
        </dl>
      </Container>

      {post.coverImageUrl ? (
        <Container width="reading" className="mt-10">
          <CoverImage src={post.coverImageUrl} />
        </Container>
      ) : null}

      <Container width="reading" className="mt-12">
        {post.contentHtml ? (
          <ProseBody html={post.contentHtml} />
        ) : (
          <p className="max-w-measure text-muted">
            The text of this {briefing ? 'issue' : kind} is not stored here.
            {post.externalUrl ? (
              <>
                {' '}
                <ExternalLink href={post.externalUrl}>Read it on Beehiiv</ExternalLink>.
              </>
            ) : null}
          </p>
        )}

        {post.externalUrl ? (
          <p className="mt-12 max-w-measure text-meta text-muted">
            Originally published on{' '}
            <ExternalLink href={post.externalUrl}>Beehiiv</ExternalLink>.
          </p>
        ) : null}

        <PrintPermalink path={postPath(post)} className="mt-12" />
      </Container>

      <Container width="reading" className="mt-16">
        <SubscribePanel heading="Get the next briefing by email" tone="plain" />
      </Container>

      {previous || next ? (
        <Container width="reading" className="mt-16">
          {/* Hidden in print: both sides are links to pages a sheet of paper
              cannot reach. */}
          <nav aria-label={`More ${kind}s`} className="border-t border-hairline pt-8 print:hidden">
            {/* Position encodes direction: earlier on the left, later on the
                right. No arrow glyphs. */}
            <div className="grid gap-8 sm:grid-cols-2">
              <AdjacentPost post={previous} label={`Previous ${kind}`} align="start" />
              <AdjacentPost post={next} label={`Next ${kind}`} align="end" />
            </div>
          </nav>
        </Container>
      ) : null}
    </article>
  );
}

function AdjacentPost({
  post,
  label,
  align,
}: {
  post: IssueSummary | null;
  label: string;
  align: 'start' | 'end';
}) {
  if (!post) return <div aria-hidden="true" />;

  return (
    <div className={align === 'end' ? 'sm:text-right' : undefined}>
      <p className="text-meta text-muted">{label}</p>
      <Link
        href={postPath(post)}
        className="mt-1 inline-flex min-h-11 items-center text-[1.125rem] font-semibold text-fg transition-colors hover:text-link"
      >
        {post.title}
      </Link>
    </div>
  );
}

/**
 * Post images come from whatever CDN the sending platform uses, and that host
 * changes without notice. Routing them through next/image would require a
 * remotePatterns allowlist that fails silently the day the host changes, so
 * they stay plain <img> with native lazy loading. The lint rule is disabled
 * here and nowhere else.
 */
function CoverImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="w-full border border-hairline"
    />
  );
}
