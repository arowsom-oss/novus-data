/**
 * The contract between the site and wherever issues happen to come from.
 *
 * Pages import from `@/lib/content` only. They never import a source
 * implementation, never mention RSS, and never need to know that Beehiiv
 * exists. That boundary is what lets the publication move off Beehiiv later
 * without touching a single page.
 */

/**
 * What kind of post this is. Briefings are the emailed newsletter and live at
 * /briefings; articles and long-term reviews are written for the site and
 * live at /articles.
 *
 * All three are written in Beehiiv and arrive through the same
 * `npm run sync-issues`, so publishing any of them stays the one manual step
 * Rule 6 allows. The kind comes from the post's Beehiiv tags (KIND_TAGS
 * below) — tag a post "Article" or "Long-term review" in Beehiiv and it files
 * itself. A `kind:` line in the frontmatter overrides the tags, for the rare
 * hand-written file.
 */
export type PostKind = 'briefing' | 'article' | 'review';

export const POST_KIND_LABELS: Record<PostKind, string> = {
  briefing: 'Briefing',
  article: 'Article',
  review: 'Long-term review',
};

/** A post's one URL: briefings under /briefings, articles and reviews under /articles. */
export function postPath(post: { kind: PostKind; slug: string }): string {
  return post.kind === 'briefing' ? `/briefings/${post.slug}` : `/articles/${post.slug}`;
}

/** Beehiiv tags that file a post as an article or a review. Compared case-insensitively. */
export const KIND_TAGS: Record<'article' | 'review', string[]> = {
  article: ['article', 'articles'],
  review: ['long-term review', 'long term review', 'long-term reviews', 'review', 'reviews'],
};

/** Pure, so the loader, the fixtures and a test agree. Anything unrecognised is a briefing. */
export function kindFor(explicit: unknown, tags: string[]): PostKind {
  if (explicit === 'briefing' || explicit === 'article' || explicit === 'review') return explicit;
  const lowered = tags.map((tag) => tag.trim().toLowerCase());
  if (lowered.some((tag) => KIND_TAGS.review.includes(tag))) return 'review';
  if (lowered.some((tag) => KIND_TAGS.article.includes(tag))) return 'article';
  return 'briefing';
}

export interface IssueSummary {
  /** Stable, URL-safe, and permanent once published. Never renamed. */
  slug: string;
  /** Briefing, article or long-term review. Decides the URL and the list it appears in. */
  kind: PostKind;
  /** Null when the issue carries no number. Never derived from position. */
  issueNumber: number | null;
  title: string;
  /**
   * ISO 8601 timestamp as written in the file. Kept as a raw string rather
   * than a Date so an unparseable value survives to the formatter, which
   * returns null and causes the UI to omit the date. Today's date is never
   * substituted for a missing one.
   */
  publishedAt: string;
  /** Plain text, no HTML. Null when the issue supplied none. */
  excerpt: string | null;
  /** Canonical URL on the original publishing platform, when one exists. */
  externalUrl: string | null;
  coverImageUrl: string | null;
  tags: string[];
}

export interface Issue extends IssueSummary {
  /** Sanitised at write time. Null when no body was captured. */
  contentHtml: string | null;
}

export interface ContentSource {
  /** Newest first. `limit` caps the result; omit it for everything. */
  listIssues(limit?: number): Promise<IssueSummary[]>;
  /** Null for an unknown slug — the route turns that into a 404. */
  getIssue(slug: string): Promise<Issue | null>;
}

/** Where an issue sits in the archive, for previous/next navigation. */
export interface IssueNeighbours {
  /** The issue published immediately before this one. */
  previous: IssueSummary | null;
  /** The issue published immediately after this one. */
  next: IssueSummary | null;
}

/** Reported by /debug/content so a bad file is visible immediately. */
export interface ContentDiagnostics {
  sourceName: string;
  directory: string;
  fileCount: number;
  issues: Array<{
    file: string;
    slug: string;
    title: string;
    publishedAt: string;
    dateParsed: boolean;
    issueNumber: number | null;
    bodyLength: number;
    words: number;
    hasExcerpt: boolean;
  }>;
  warnings: string[];
}
