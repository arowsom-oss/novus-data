import Link from 'next/link';

import type { IssueSummary } from '@/lib/content';
import { formatIssueNumber, formatShortDate } from '@/lib/format';

/**
 * An archive row. A list, not a card — the archive is a sequence, and a
 * sequence reads as aligned columns.
 *
 * The issue number and date are set in tabular numerals and given fixed
 * columns from the small breakpoint up, so they form a true column down the
 * page. That alignment is the credibility signal: it shows a run of dated,
 * numbered work.
 */
function IssueRow({ issue, basePath }: { issue: IssueSummary; basePath: string }) {
  // Articles and reviews carry no issue number, and an empty number column
  // would push every date in by its width.
  const numbered = basePath === '/briefings';
  const number = formatIssueNumber(issue.issueNumber);
  const date = formatShortDate(issue.publishedAt);

  return (
    <li className="border-t border-hairline">
      <Link
        href={`${basePath}/${issue.slug}`}
        className={`group grid gap-x-6 gap-y-2 px-2 py-6 transition-colors hover:bg-surface sm:px-3 ${
          numbered ? 'sm:grid-cols-[4.5rem_7rem_1fr]' : 'sm:grid-cols-[7rem_1fr]'
        }`}
      >
        <div className={`col-span-full flex items-baseline gap-4 sm:col-span-1 ${numbered ? 'sm:block' : 'sm:hidden'}`}>
          {number ? (
            <span data-numeric className="text-meta text-muted">
              {number}
            </span>
          ) : null}
          {date ? (
            <time dateTime={issue.publishedAt} className="text-meta text-muted sm:hidden">
              {date}
            </time>
          ) : null}
        </div>

        {date ? (
          <time
            dateTime={issue.publishedAt}
            className="hidden text-meta text-muted sm:block sm:pt-0.5"
          >
            {date}
          </time>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}

        <div className="col-span-full sm:col-span-1">
          <h3 className="text-[1.3125rem] font-semibold leading-snug text-fg transition-colors group-hover:text-link sm:text-[1.375rem]">
            {issue.title}
          </h3>
          {issue.excerpt ? (
            <p className="mt-2 max-w-[62ch] text-[0.9375rem] text-muted">{issue.excerpt}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function IssueList({
  issues,
  label,
  basePath = '/briefings',
}: {
  issues: IssueSummary[];
  /** Accessible name for the list, e.g. "Recent briefings". */
  label: string;
  /** Where each row links. Articles and reviews live under /articles. */
  basePath?: '/briefings' | '/articles';
}) {
  return (
    <ul aria-label={label} className="border-b border-hairline">
      {issues.map((issue) => (
        <IssueRow key={issue.slug} issue={issue} basePath={basePath} />
      ))}
    </ul>
  );
}
