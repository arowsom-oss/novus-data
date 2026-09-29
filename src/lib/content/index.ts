/**
 * The public content API. Pages and components import from here and nowhere
 * else in this folder.
 *
 * If you find yourself importing `./sources/local-files` from a page, stop:
 * the whole point of this layer is that pages do not know where issues come
 * from. An ESLint rule in eslint.config.mjs enforces it.
 */

import type { Issue, IssueNeighbours, IssueSummary, PostKind } from './types';
import { getContentSource } from './sources';

export type { ContentDiagnostics, Issue, IssueNeighbours, IssueSummary, PostKind } from './types';
export { KIND_TAGS, POST_KIND_LABELS, postPath } from './types';
export { getContentSourceName } from './sources';

/**
 * "Issue" in this API means a BRIEFING — the emailed newsletter, at
 * /briefings. Articles and long-term reviews come from the same source but
 * are listed separately below, at /articles. Every existing caller of
 * listIssues() meant the newsletter archive, so the name keeps that meaning.
 */
async function everything(): Promise<IssueSummary[]> {
  return getContentSource().listIssues();
}

/** Briefings, newest first. `limit` caps the result. */
export async function listIssues(limit?: number): Promise<IssueSummary[]> {
  const briefings = (await everything()).filter((post) => post.kind === 'briefing');
  return typeof limit === 'number' ? briefings.slice(0, limit) : briefings;
}

/** A briefing, or null — including for the slug of an article, which lives at /articles. */
export async function getIssue(slug: string): Promise<Issue | null> {
  const post = await getContentSource().getIssue(slug);
  return post && post.kind === 'briefing' ? post : null;
}

// ---------------------------------------------------------------------------
// Articles and long-term reviews
// ---------------------------------------------------------------------------

/** Newest first. Omit `kind` for both. */
export async function listArticles(
  kind?: Exclude<PostKind, 'briefing'>,
  limit?: number,
): Promise<IssueSummary[]> {
  const posts = (await everything()).filter((post) =>
    kind ? post.kind === kind : post.kind === 'article' || post.kind === 'review',
  );
  return typeof limit === 'number' ? posts.slice(0, limit) : posts;
}

/** An article or review, or null — including for a briefing's slug. */
export async function getArticle(slug: string): Promise<Issue | null> {
  const post = await getContentSource().getIssue(slug);
  return post && post.kind !== 'briefing' ? post : null;
}

export async function listArticleSlugs(): Promise<string[]> {
  return (await listArticles()).map((post) => post.slug);
}

/** Previous/next among posts of the same kind, so a review leads to reviews. */
export async function getArticleNeighbours(slug: string): Promise<IssueNeighbours> {
  const current = await getArticle(slug);
  if (!current) return { previous: null, next: null };
  const posts = await listArticles(current.kind as Exclude<PostKind, 'briefing'>);
  const index = posts.findIndex((post) => post.slug === slug);
  return { previous: posts[index + 1] ?? null, next: posts[index - 1] ?? null };
}

/** Every slug, for generateStaticParams and the sitemap. */
export async function listIssueSlugs(): Promise<string[]> {
  const issues = await listIssues();
  return issues.map((issue) => issue.slug);
}

/**
 * Previous/next in archive order. "Previous" means published earlier, which is
 * the later position in a newest-first list.
 */
export async function getIssueNeighbours(slug: string): Promise<IssueNeighbours> {
  const issues = await listIssues();
  const index = issues.findIndex((issue) => issue.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: issues[index + 1] ?? null,
    next: issues[index - 1] ?? null,
  };
}

/** Issues grouped by publication year, newest year first. */
export async function listIssuesByYear(): Promise<Array<{ year: string; issues: IssueSummary[] }>> {
  const issues = await listIssues();
  const groups = new Map<string, IssueSummary[]>();

  for (const issue of issues) {
    const date = new Date(issue.publishedAt);
    // Issues with no usable date are grouped separately rather than being
    // silently filed under the current year.
    const year = Number.isNaN(date.getTime()) ? 'Undated' : String(date.getUTCFullYear());
    const bucket = groups.get(year);
    if (bucket) bucket.push(issue);
    else groups.set(year, [issue]);
  }

  return [...groups.entries()]
    .sort((a, b) => {
      if (a[0] === 'Undated') return 1;
      if (b[0] === 'Undated') return -1;
      return Number(b[0]) - Number(a[0]);
    })
    .map(([year, grouped]) => ({ year, issues: grouped }));
}

/** Used by the archive page to decide whether to group by year. */
export const GROUP_ARCHIVE_ABOVE = 12;
