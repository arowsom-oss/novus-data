/**
 * Structured data builders.
 *
 * Every field here has to be backed by something real. Where a value is not
 * available — no author name, no external URL — the key is left out entirely
 * rather than filled with a placeholder, because structured data is consumed
 * by machines that will repeat whatever it is told.
 */

import { namedAuthors, publication, recordedBy } from '@/config/publication';
import type { Issue } from '@/lib/content';
import type { Disruption } from '@/lib/disruptions/types';
import { absoluteUrl, env } from '@/lib/env';
import { toDate } from '@/lib/format';

type Json = Record<string, unknown>;

/** Drop keys whose value is null or undefined. */
function compact(input: Json): Json {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value != null));
}

export function publicationJsonLd(): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: publication.name,
    description: publication.description,
    url: absoluteUrl('/'),
    email: env.contactEmail ?? undefined,
    // Everyone on the masthead, so the organisation's own markup matches the
    // byline a reader sees rather than naming only the first person.
    founder: namedAuthors().length > 0
      ? namedAuthors().map((author) => ({ '@type': 'Person', name: author.name }))
      : undefined,
    sameAs: [env.beehiivHomeUrl].filter((value): value is string => Boolean(value)),
  });
}

export function issueJsonLd(issue: Issue, canonicalUrl: string): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: issue.title,
    description: issue.excerpt ?? undefined,
    datePublished: toDate(issue.publishedAt)?.toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    author: namedAuthors().length > 0
      ? namedAuthors().map((author) => ({ '@type': 'Person', name: author.name }))
      : undefined,
    publisher: { '@type': 'Organization', name: publication.name },
    image: issue.coverImageUrl ?? undefined,
    isPartOf: {
      '@type': 'Periodical',
      name: publication.name,
      url: absoluteUrl('/'),
    },
  });
}

/**
 * A register entry, as an Article.
 *
 * `datePublished` is when the disruption was first recorded and `dateModified`
 * is the review date, which is the one that matters — a consumer reading this
 * should be able to see how current the assessment is without opening the page.
 * Fields that cannot be filled from real data are omitted, as everywhere else.
 */
export function disruptionJsonLd(disruption: Disruption, canonicalUrl: string): Json {
  const iso = (value: string): string | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: disruption.title,
    description: disruption.summary,
    datePublished: iso(disruption.startedAt) ?? iso(disruption.updatedAt),
    dateModified: iso(disruption.updatedAt),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    // The person who made THIS assessment, not a site-wide byline. Falls back
    // to the editor, who stands behind anything the publication prints.
    author: (() => {
      const recorder = recordedBy(disruption.author);
      return recorder ? { '@type': 'Person', name: recorder.name } : undefined;
    })(),
    publisher: { '@type': 'Organization', name: publication.name },
    // Only the entry's own citations, which are required to exist at all.
    citation: disruption.sources.map((source) => ({
      '@type': 'CreativeWork',
      name: source.title,
      url: source.url,
      publisher: { '@type': 'Organization', name: source.publisher },
    })),
    about: disruption.exposures.map((exposure) => ({
      '@type': 'Thing',
      name: exposure.entity.name,
    })),
  });
}
