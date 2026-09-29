import { hasCoAuthors, publication, recordedBy } from '@/config/publication';
import type { DisruptionSummary, Severity } from '@/lib/disruptions';
import { STALE_AFTER_DAYS, listDisruptions, worstOf } from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';

/**
 * The register as a machine-readable feed — JSON Feed 1.1.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT IS THE REGISTER RATHER THAN THE BRIEFINGS
 *
 * CLAUDE.md §14.2 describes the seam between this repository and a future
 * notification service: the site stays a static publication, and a separate
 * service owns device tokens, preferences and delivery. A feed is the join.
 *
 * §14.2 originally proposed a feed of issues. This is a feed of the REGISTER
 * instead, because alerts do not fire on newsletters — they fire on a
 * disruption opening, escalating, or being re-reviewed. An issues feed is a
 * reading convenience; this is the actual trigger source.
 *
 * ---------------------------------------------------------------------------
 * ITEMS ARE STATE, NOT EVENTS — AND THAT IS DELIBERATE
 *
 * One item per disruption, carrying its current state and its review date.
 * There is no event log here ("opened", "escalated") because this repository
 * does not have one: a register entry is a file holding the assessment as it
 * stands, not a history of how it got there. Emitting an event stream would
 * mean inventing transitions nobody recorded, which is precisely the kind of
 * plausible-looking fabrication Rule 1 exists to stop.
 *
 * So the consumer diffs. A watcher keeps the last `date_modified` and
 * `_novus.severity` it saw per `id`, and fires when an id is new, its
 * `date_modified` moves, or its status or severity changes. That is a handful
 * of lines in the service, it needs no state here, and every value it compares
 * is one a human actually wrote and dated.
 *
 * ---------------------------------------------------------------------------
 * EVERY FIELD HERE IS ONE A HUMAN WROTE
 *
 * Nothing in this feed is derived beyond `severity`, which is a real maximum
 * across the open exposures rather than a blend — the same rule the entity
 * pages hold to. There is deliberately no composite score, no trend and no
 * count-based ranking, because a number that travels without its page is read
 * with far less care than one that sits next to its sources.
 *
 * `id` is the disruption's permanent id — the same string that is its URL. It
 * is stable across rebuilds and renames, so it is usable as a notification key
 * exactly as §14.2 requires of `slug`.
 * ---------------------------------------------------------------------------
 */

export const dynamic = 'force-static';

/** JSON Feed 1.1 items carry a `_`-prefixed object for extension data. */
interface NovusExtension {
  status: DisruptionSummary['status'];
  category: DisruptionSummary['category'];
  /** Strongest severity currently assessed. Null when nothing is established. */
  severity: Severity | null;
  /** Entity ids reached, so a watcher can match against a reader's watchlist. */
  entities: string[];
  /**
   * Those same ids mapped to display names.
   *
   * `entities` stays a plain id array because matching a watchlist is the
   * common case and an array of strings is the cheapest thing to intersect.
   * But a notification has to name something a person recognises, and a client
   * with ids alone has two bad options: title-case the slug, which gets
   * "Bhp Group" wrong the first time it matters, or fetch one entity page per
   * id on every poll.
   *
   * A map rather than a second array so it cannot fall out of order with
   * `entities`, and so a consumer that does not need names can ignore one key.
   */
  entityNames: Record<string, string>;
  /**
   * The display name of whoever recorded this assessment, or null on a
   * one-author publication where a per-entry byline would just repeat the
   * masthead. A notification that says who made a call is materially more
   * useful than one that does not, and it costs one string.
   */
  recordedBy: string | null;
  /** The review date, repeated in plain ISO for consumers that ignore dates. */
  reviewedAt: string;
  startedAt: string;
  stale_after_days: number;
}


/** ISO 8601 with an offset, which JSON Feed requires. Dates are day-precision. */
function toTimestamp(day: string): string | undefined {
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function GET() {
  const disruptions = await listDisruptions();

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${publication.name} — disruption register`,
    home_page_url: absoluteUrl('/disruptions'),
    feed_url: absoluteUrl('/register.json'),
    description:
      'Every disruption tracked by Novus Data, with its status, the date it was last ' +
      'reviewed, and the companies and sectors it is assessed to reach. Items are current ' +
      'state, not an event log: compare date_modified against the last value you saw.',
    icon: absoluteUrl('/icon'),
    items: disruptions.map((disruption) => {
      const extension: NovusExtension = {
        status: disruption.status,
        category: disruption.category,
        severity: disruption.exposures.length > 0 ? worstOf(disruption.exposures) : null,
        entities: disruption.exposures.map((exposure) => exposure.entity.id),
        entityNames: Object.fromEntries(
          disruption.exposures.map((exposure) => [exposure.entity.id, exposure.entity.name]),
        ),
        recordedBy: hasCoAuthors() ? (recordedBy(disruption.author)?.name ?? null) : null,
        reviewedAt: disruption.updatedAt,
        startedAt: disruption.startedAt,
        stale_after_days: STALE_AFTER_DAYS,
      };

      return {
        id: disruption.id,
        url: absoluteUrl(`/disruptions/${disruption.id}`),
        title: disruption.title,
        summary: disruption.summary,
        content_text: disruption.summary,
        ...(toTimestamp(disruption.startedAt)
          ? { date_published: toTimestamp(disruption.startedAt) }
          : {}),
        ...(toTimestamp(disruption.updatedAt)
          ? { date_modified: toTimestamp(disruption.updatedAt) }
          : {}),
        tags: [disruption.category, disruption.status],
        _novus: extension,
      };
    }),
  };

  return Response.json(feed, {
    headers: {
      'content-type': 'application/feed+json; charset=utf-8',
      // Static output, so this is advisory for any CDN in front of it.
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
