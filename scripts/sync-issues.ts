/**
 * Pull new issues from the Beehiiv RSS feed into content/issues/.
 *
 * This is the only code in the project that touches Beehiiv, and it runs by
 * hand — never at build time, never at request time. Whatever it writes into
 * content/issues/ is owned by this repository from then on.
 *
 *   npm run sync-issues                  fetch and write anything new
 *   npm run sync-issues -- --dry-run     report what would be written
 *   npm run sync-issues -- --force slug  re-pull and overwrite one issue
 *
 * Existing files are never overwritten without --force, because a local file
 * may have been hand-edited to fix a typo and that edit is the better copy.
 *
 * IMPORTANT: a Beehiiv feed carries only a window of recent items — commonly
 * about twenty. Sync promptly after each send. An issue that ages out of the
 * window cannot be recovered by this script and has to be written by hand.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { XMLParser } from 'fast-xml-parser';
import sanitizeHtml from 'sanitize-html';

import { POST_KIND_LABELS, kindFor, postPath, type PostKind } from '@/lib/content/types';

import { plural, yamlString } from './lib/cli';

const ISSUES_DIR = path.join(process.cwd(), 'content', 'issues');
const EXCERPT_TARGET_LENGTH = 200;

// --- argument parsing -------------------------------------------------------

interface Options {
  dryRun: boolean;
  forceSlug: string | null;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { dryRun: false, forceSlug: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    // npm strips the first `--`, but a direct `tsx scripts/...` invocation
    // does not. Tolerate it either way.
    if (arg === '--') {
      continue;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        fail('--force needs the slug of the issue to overwrite, e.g. --force panama-transits-recover');
      }
      options.forceSlug = value;
      i += 1;
    } else if (arg.startsWith('--force=')) {
      options.forceSlug = arg.slice('--force='.length);
    } else {
      fail(`Unrecognised argument: ${arg}`);
    }
  }

  return options;
}

function fail(message: string): never {
  console.error(`\nsync-issues: ${message}\n`);
  process.exit(1);
}

// --- feed parsing -----------------------------------------------------------

interface FeedItem {
  title: string;
  link: string | null;
  guid: string | null;
  pubDate: string | null;
  description: string | null;
  contentHtml: string | null;
  coverImageUrl: string | null;
  categories: string[];
}

/** Anything that might be a string in parsed XML, flattened to a string. */
function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // fast-xml-parser puts element text under #text when attributes exist.
    if (typeof record['#text'] === 'string') return record['#text'].trim() || null;
  }
  return null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function attribute(value: unknown, name: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const raw = record[`@_${name}`];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

function parseFeed(xml: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    // Keep namespace prefixes so content:encoded and media:content stay
    // distinguishable from their unprefixed cousins.
    removeNSPrefix: false,
    // Treat every value as text. Without this a numeric-looking title or a
    // slug such as "2026" would come back as a number.
    parseTagValue: false,
    parseAttributeValue: false,
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = (rss?.channel ?? parsed.channel) as Record<string, unknown> | undefined;

  if (!channel) {
    fail('The feed parsed, but it has no <channel> element. Is the URL really an RSS feed?');
  }

  const rawItems = asArray(channel.item as Record<string, unknown> | Record<string, unknown>[]);

  return rawItems.map((item) => {
    const enclosure = item.enclosure;
    const mediaContent = item['media:content'];

    return {
      title: text(item.title) ?? 'Untitled',
      link: text(item.link),
      guid: text(item.guid),
      pubDate: text(item.pubDate),
      description: text(item.description),
      contentHtml: text(item['content:encoded']),
      coverImageUrl:
        attribute(enclosure, 'url') ??
        attribute(mediaContent, 'url') ??
        attribute(item['media:thumbnail'], 'url'),
      categories: asArray(item.category)
        .map((category) => text(category))
        .filter((category): category is string => category !== null),
    };
  });
}

// --- field derivation -------------------------------------------------------

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * The final path segment of <link> is the published URL of the issue, so it is
 * the slug the outside world already uses. Falling back to the title only
 * happens when a feed item has no usable link.
 */
function deriveSlug(item: FeedItem): string {
  if (item.link) {
    try {
      const url = new URL(item.link);
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last) {
        const slug = slugify(decodeURIComponent(last));
        if (slug) return slug;
      }
    } catch {
      // Not a parseable URL; fall through to the title.
    }
  }

  return slugify(item.title) || 'issue';
}

/**
 * Only reads a number the title actually states. Never counts position in the
 * directory, because a numbering gap or a special issue would corrupt it.
 */
function deriveIssueNumber(title: string): number | null {
  const patterns = [/\bissue\s*#?\s*(\d{1,5})\b/i, /\bno\.?\s*(\d{1,5})\b/i, /#(\d{1,5})\b/];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate at a word boundary near the target length; never mid-word. */
function deriveExcerpt(item: FeedItem): string | null {
  const source = item.description ?? item.contentHtml;
  if (!source) return null;

  const plain = stripHtml(source);
  if (!plain) return null;
  if (plain.length <= EXCERPT_TARGET_LENGTH) return plain;

  const clipped = plain.slice(0, EXCERPT_TARGET_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  const cut = lastSpace > EXCERPT_TARGET_LENGTH * 0.6 ? clipped.slice(0, lastSpace) : clipped;

  return `${cut.replace(/[,;:.\-–—]+$/, '')}…`;
}

function derivePublishedAt(item: FeedItem): string | null {
  if (!item.pubDate) return null;
  const date = new Date(item.pubDate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// --- sanitisation -----------------------------------------------------------

/**
 * The allowlist. Everything not named here is dropped, including script,
 * style, iframe, every event handler and every inline style.
 */
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'a', 'strong', 'em', 'b', 'i', 'u', 's', 'sup', 'sub', 'span',
    'blockquote', 'figure', 'figcaption', 'img',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'code', 'pre',
  ],
  allowedAttributes: {
    // rel and target must be listed here as well as set in transformTags:
    // the allowlist is applied after the transform, so an attribute the
    // transform adds is stripped again unless it is permitted.
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Drop the contents of these entirely rather than leaving their text behind.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'],
  transformTags: {
    // Outbound links are rel-hardened and open in a new tab, matching how the
    // same link behaves in the email.
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
    }),
    // Images stay plain <img> rather than going through next/image, which
    // would need a remotePatterns allowlist that breaks silently whenever the
    // newsletter CDN changes host.
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: 'lazy', decoding: 'async' },
    }),
  },
};

function sanitiseBody(html: string | null): string | null {
  if (!html) return null;
  const cleaned = sanitizeHtml(html, sanitizeOptions)
    // Removing a <script> or <style> block leaves the blank line it sat on.
    // Collapse those so the stored file stays readable for hand-editing.
    .replace(/(?:[ \t]*\r?\n){3,}/g, '\n\n')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

// --- writing ----------------------------------------------------------------

interface IssueFile {
  kind: PostKind;
  fileName: string;
  slug: string;
  contents: string;
}

function renderIssueFile(fields: {
  issueNumber: number | null;
  title: string;
  slug: string;
  publishedAt: string | null;
  excerpt: string | null;
  beehiivUrl: string | null;
  coverImageUrl: string | null;
  tags: string[];
  body: string | null;
}): string {
  const frontmatter = [
    '---',
    `issueNumber: ${fields.issueNumber === null ? 'null' : fields.issueNumber}`,
    `title: ${yamlString(fields.title)}`,
    `slug: ${yamlString(fields.slug)}`,
    `publishedAt: ${yamlString(fields.publishedAt)}`,
    `excerpt: ${yamlString(fields.excerpt)}`,
    `beehiivUrl: ${yamlString(fields.beehiivUrl)}`,
    `coverImageUrl: ${yamlString(fields.coverImageUrl)}`,
    fields.tags.length === 0
      ? 'tags: []'
      : `tags:\n${fields.tags.map((tag) => `  - ${yamlString(tag)}`).join('\n')}`,
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${fields.body ?? ''}\n`;
}

/** Existing slug → filename, so a re-sync can recognise what it already has. */
async function readExisting(): Promise<{ bySlug: Map<string, string>; maxPrefix: number }> {
  const bySlug = new Map<string, string>();
  let maxPrefix = 0;

  if (!existsSync(ISSUES_DIR)) return { bySlug, maxPrefix };

  for (const name of await readdir(ISSUES_DIR)) {
    if (!name.endsWith('.md')) continue;
    const match = name.match(/^(\d+)-(.+)\.md$/);
    if (match) {
      maxPrefix = Math.max(maxPrefix, Number(match[1]));
      bySlug.set(match[2], name);
    } else {
      bySlug.set(name.replace(/\.md$/, ''), name);
    }
  }

  return { bySlug, maxPrefix };
}

// --- main -------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const feedUrl = process.env.BEEHIIV_RSS_URL?.trim();
  if (!feedUrl) {
    fail(
      'BEEHIIV_RSS_URL is not set.\n' +
        '  Add it to .env.local (it is only ever read by this script, never by the site):\n' +
        '    BEEHIIV_RSS_URL=https://yourpublication.beehiiv.com/feed',
    );
  }

  console.log(`Fetching ${feedUrl}`);

  let xml: string;
  try {
    const response = await fetch(feedUrl, {
      headers: { accept: 'application/rss+xml, application/xml, text/xml' },
    });
    if (!response.ok) {
      fail(`The feed returned HTTP ${response.status} ${response.statusText}. Nothing was written.`);
    }
    xml = await response.text();
  } catch (error) {
    // Never silent: a failed sync must be obvious in the terminal and must
    // exit non-zero so it cannot pass unnoticed in a script.
    fail(`Could not fetch the feed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const items = parseFeed(xml);
  console.log(`Feed contains ${plural(items.length, 'item')}.`);

  if (items.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const { bySlug, maxPrefix } = await readExisting();

  // Assign slugs first so collisions inside one run are resolved before any
  // prefix numbering happens.
  const takenSlugs = new Set(bySlug.keys());
  const resolved = items.map((item) => {
    const base = deriveSlug(item);
    let slug = base;
    let suffix = 2;

    const isForced = options.forceSlug !== null && base === options.forceSlug;
    while (takenSlugs.has(slug) && !isForced) {
      // Only ever collides for genuinely different items that derive the same
      // slug; an item already on disk is skipped below, not renamed.
      if (bySlug.has(slug)) break;
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    takenSlugs.add(slug);
    return { item, slug };
  });

  const toWrite: IssueFile[] = [];
  const skipped: string[] = [];

  // New issues are numbered in publication order, so the filename prefix is a
  // reliable sort key even when the feed returns items newest-first.
  const pending = resolved
    .filter(({ slug }) => {
      const exists = bySlug.has(slug);
      if (exists && slug !== options.forceSlug) {
        skipped.push(slug);
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = derivePublishedAt(a.item) ?? '';
      const dateB = derivePublishedAt(b.item) ?? '';
      return dateA.localeCompare(dateB);
    });

  let nextPrefix = maxPrefix;

  for (const { item, slug } of pending) {
    const overwriting = bySlug.get(slug);
    // A forced re-pull keeps the file it already had, prefix included, so the
    // archive's sort order does not shift underneath a permanent URL.
    const fileName = overwriting ?? `${String(++nextPrefix).padStart(4, '0')}-${slug}.md`;

    const body = sanitiseBody(item.contentHtml);
    const publishedAt = derivePublishedAt(item);

    if (!publishedAt) {
      console.warn(`  warning: ${slug} has no usable pubDate; publishedAt will be null.`);
    }
    if (!body) {
      console.warn(
        `  warning: ${slug} has no content:encoded body. The feed may carry summaries only.`,
      );
    }

    toWrite.push({
      fileName,
      slug,
      kind: kindFor(undefined, item.categories),
      contents: renderIssueFile({
        issueNumber: deriveIssueNumber(item.title),
        title: item.title,
        slug,
        publishedAt,
        excerpt: deriveExcerpt(item),
        beehiivUrl: item.link,
        coverImageUrl: item.coverImageUrl,
        tags: item.categories,
        body,
      }),
    });
  }

  if (!options.dryRun && toWrite.length > 0) {
    await mkdir(ISSUES_DIR, { recursive: true });
    for (const file of toWrite) {
      await writeFile(path.join(ISSUES_DIR, file.fileName), file.contents, 'utf8');
    }
  }

  // --- summary --------------------------------------------------------------
  console.log('');
  console.log(`  items in feed   ${items.length}`);
  console.log(`  written         ${toWrite.length}${options.dryRun ? ' (dry run — nothing saved)' : ''}`);
  console.log(`  skipped         ${skipped.length} already present`);

  if (toWrite.length > 0) {
    console.log('');
    for (const file of toWrite) {
      // Where the post will appear, so a mis-tagged article is caught here
      // rather than found later in the briefing archive.
      const where = postPath(file);
      console.log(
        `  ${options.dryRun ? 'would write' : 'wrote'}  content/issues/${file.fileName}  → ${POST_KIND_LABELS[file.kind]}, ${where}`,
      );
    }
  }

  if (options.forceSlug && !toWrite.some((file) => file.slug === options.forceSlug)) {
    console.log('');
    console.log(`  note: --force ${options.forceSlug} matched no item in the feed.`);
  }

  console.log('');
  console.log('Next: review the new files, then commit and push. Vercel deploys on push.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
