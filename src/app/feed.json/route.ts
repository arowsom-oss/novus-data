import { publication } from '@/config/publication';
import { POST_KIND_LABELS, listArticles, listIssues, postPath } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';

/**
 * Everything written for the site — briefings, articles and long-term
 * reviews — as JSON Feed 1.1.
 *
 * §14.2 listed an issues feed as "a reasonable reading convenience, still
 * unbuilt". The app prototype's Read screen is what made it necessary: an
 * app that shows the writing needs a machine-readable list of it, and
 * without one its reading list would be invented.
 *
 * Summaries only, never bodies. A post's full text lives on its page, which
 * is where its canonical URL, its print behaviour and its subscribe prompt
 * are; a feed that republished bodies would be a second copy to keep right.
 *
 * `id` is the slug — permanent and unique, enforced by the content layer —
 * so a client can store it. `_novus.kind` says which list a post belongs to.
 * Statically generated, like everything else that is not live.
 */

export const dynamic = 'force-static';

export async function GET() {
  const [briefings, articles] = await Promise.all([listIssues(), listArticles()]);
  const posts = [...briefings, ...articles].sort(
    (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0),
  );

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${publication.name} — writing`,
    home_page_url: absoluteUrl('/articles'),
    feed_url: absoluteUrl('/feed.json'),
    description: 'Briefings, articles and long-term reviews, newest first. Summaries only; each post is read on its page.',
    icon: absoluteUrl('/icon'),
    items: posts.map((post) => {
      const path = postPath(post);
      const published = Date.parse(post.publishedAt);
      return {
        id: post.slug,
        url: absoluteUrl(path),
        title: post.title,
        ...(post.excerpt ? { summary: post.excerpt, content_text: post.excerpt } : { content_text: '' }),
        // A post with no parseable date carries none, rather than today's (§6).
        ...(Number.isFinite(published) ? { date_published: new Date(published).toISOString() } : {}),
        tags: post.tags,
        _novus: {
          kind: post.kind,
          kindLabel: POST_KIND_LABELS[post.kind],
          issueNumber: post.issueNumber,
        },
      };
    }),
  };

  return Response.json(feed, {
    headers: { 'content-type': 'application/feed+json; charset=utf-8' },
  });
}
