import clsx from 'clsx';
import Link from 'next/link';

import { SeverityLegend, SeveritySwatch } from '@/components/severity-legend';
import { StatusBadge } from '@/components/status-badge';
import type { ExposureMatrix } from '@/lib/disruptions';
// Types and labels come from ./types, which is pure data. The layer index
// pulls in the filesystem-backed source, which a component has no need of.
import type { DisruptionSummary, EntityExposure } from '@/lib/disruptions/types';
import { CONFIDENCE_LABELS, SEVERITY_LABELS } from '@/lib/disruptions/types';
import { formatShortDate } from '@/lib/format';

/**
 * The exposure chart: which tracked problems reach which companies.
 *
 * Form: a heatmap grid, because the job is "compare magnitude across a grid".
 * Colour: a sequential single-hue ramp, defined and justified in globals.css.
 *
 * Built as a real <table>, not a grid of divs, so a screen reader gets row and
 * column association for free and every cell can be a focusable link. There is
 * no charting library and no client JavaScript on this page; the hover card is
 * CSS.
 *
 * The matrix is capped at MAX_COLUMNS so it never needs a horizontal scroll
 * container — a scroll container would clip the hover cards. Anything beyond
 * the cap is still in the table view below, which is always present.
 */
const MAX_COLUMNS = 9;

export function ExposureChart({ matrix }: { matrix: ExposureMatrix }) {
  const columns = matrix.disruptions.slice(0, MAX_COLUMNS);
  const hidden = matrix.disruptions.length - columns.length;

  if (matrix.rows.length === 0 || columns.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Below lg the matrix would be unreadable, so the same data is rendered
          as a per-company list instead. Both are the same source. */}
      <div className="hidden lg:block">
        <Matrix columns={columns} rows={matrix.rows} />
      </div>
      <div className="lg:hidden">
        <ExposureList matrix={matrix} />
      </div>

      <SeverityLegend />

      {hidden > 0 ? (
        <p className="text-meta text-muted">
          The grid shows the {columns.length} most recently reviewed open disruptions.{' '}
          {hidden} more {hidden === 1 ? 'is' : 'are'} in the table below.
        </p>
      ) : null}

      <ExposureTable matrix={matrix} />
    </div>
  );
}

function Matrix({
  columns,
  rows,
}: {
  columns: DisruptionSummary[];
  rows: EntityExposure[];
}) {
  return (
    /*
     * The table is `w-full` but capped at roughly one column-width per
     * disruption.
     *
     * Without the cap, `table-layout: auto` divides all remaining width
     * between however many columns exist — so at two disruptions each cell is
     * ~360px wide and the chart reads as a bar chart, with a severity fill so
     * large it dominates the page. That is not an edge case: it is the state
     * the register is in for its first months, which is exactly when the
     * chart is being judged.
     *
     * Capping the table instead of the cells keeps `table-layout: auto`, so
     * the column headers still size to their titles. Once there are enough
     * columns the cap exceeds the container and `w-full` takes over again,
     * which is the behaviour the nine-column ceiling was designed around.
     */
    <table
      className="w-full border-collapse"
      style={{ maxWidth: `calc(16rem + ${columns.length} * 11rem)` }}
    >
      <caption className="sr-only">
        Exposure of tracked companies and sectors to open supply chain disruptions. Each cell
        gives the severity and the confidence of the assessment.
      </caption>
      <thead>
        <tr>
          <th scope="col" className="w-[16rem] p-0 text-left align-bottom">
            <span className="sr-only">Company or sector</span>
          </th>
          {columns.map((disruption) => (
            <th
              key={disruption.id}
              scope="col"
              className="p-0 px-1 pb-3 align-bottom text-left"
            >
              <Link
                href={`/disruptions/${disruption.id}`}
                className="group block min-h-11"
                title={disruption.title}
              >
                <span
                  data-numeric
                  className="block text-meta font-medium text-fg transition-colors group-hover:text-link"
                >
                  {disruption.shortLabel}
                </span>
                <span className="mt-1 block text-[0.6875rem] leading-tight text-muted">
                  {disruption.title}
                </span>
              </Link>
              {/* The column's own state, so a reader is not reading live
                  severity off a disruption that is already resolving. */}
              <StatusBadge status={disruption.status} className="mt-2 text-[0.6875rem]" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.entity.id} id={`entity-${row.entity.id}`} className="border-t border-hairline">
            <th scope="row" className="py-2 pr-4 text-left align-middle font-normal">
              {/* The row header is the way into the entity's own page. The
                  cells keep linking to the disruption behind each claim, so
                  the two axes of the chart lead to the two kinds of page. */}
              <Link href={`/entities/${row.entity.id}`} className="group block">
                <span className="block text-[0.9375rem] text-fg transition-colors group-hover:text-link">
                  {row.entity.name}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-muted">
                  {row.entity.ticker ? `${row.entity.ticker} · ` : ''}
                  {row.entity.sector}
                </span>
              </Link>
            </th>
            {columns.map((disruption, index) => {
              const exposure = row.byDisruption.get(disruption.id);
              const late = index >= columns.length - 2;

              if (!exposure) {
                return (
                  <td key={disruption.id} className="p-1 align-middle">
                    <span className="exposure-cell" data-severity="none">
                      <span className="sr-only">
                        {row.entity.name}, {disruption.title}: no assessment recorded.
                      </span>
                    </span>
                  </td>
                );
              }

              return (
                <td
                  key={disruption.id}
                  className={clsx('p-1 align-middle', late && 'exposure-col-late')}
                >
                  <Link
                    href={`/disruptions/${disruption.id}#entity-${row.entity.id}`}
                    className="exposure-cell"
                    data-severity={exposure.severity}
                    data-confidence={exposure.confidence}
                  >
                    <span className="sr-only">
                      {row.entity.name}, {disruption.title}: {SEVERITY_LABELS[exposure.severity]}{' '}
                      exposure, {CONFIDENCE_LABELS[exposure.confidence].toLowerCase()}, as of{' '}
                      {formatShortDate(exposure.asOf) ?? 'an unrecorded date'}. {exposure.mechanism}
                    </span>
                    <span className="exposure-card" aria-hidden="true">
                      <span className="block text-meta text-muted">{disruption.title}</span>
                      <span className="mt-1 block text-[0.9375rem] font-medium text-fg">
                        {row.entity.name}
                      </span>
                      <span className="mt-2 block text-[0.8125rem] leading-snug text-fg">
                        {exposure.mechanism}
                      </span>
                      <span className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-muted">
                        <span>{SEVERITY_LABELS[exposure.severity]} exposure</span>
                        <span>{CONFIDENCE_LABELS[exposure.confidence]}</span>
                        <span data-numeric>as of {formatShortDate(exposure.asOf)}</span>
                      </span>
                    </span>
                  </Link>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The under-lg rendering. Same data, read down instead of across. */
function ExposureList({ matrix }: { matrix: ExposureMatrix }) {
  const byId = new Map(matrix.disruptions.map((entry) => [entry.id, entry]));

  return (
    <ul className="flex flex-col">
      {matrix.rows.map((row) => (
        <li key={row.entity.id} id={`entity-${row.entity.id}`} className="border-t border-hairline py-5">
          <Link href={`/entities/${row.entity.id}`} className="group inline-flex min-h-11 flex-col justify-center">
            <span className="text-[1.0625rem] text-fg transition-colors group-hover:text-link">
              {row.entity.name}
            </span>
            <span className="mt-0.5 text-meta text-muted">
              {row.entity.ticker ? `${row.entity.ticker} · ` : ''}
              {row.entity.sector}
            </span>
          </Link>

          <ul className="mt-3 flex flex-col gap-2.5">
            {[...row.byDisruption.entries()].map(([disruptionId, exposure]) => {
              const disruption = byId.get(disruptionId);
              if (!disruption) return null;

              return (
                <li key={disruptionId}>
                  <Link
                    href={`/disruptions/${disruption.id}#entity-${row.entity.id}`}
                    className="flex gap-3"
                  >
                    <SeveritySwatch severity={exposure.severity} confidence={exposure.confidence} className="mt-0.5 h-5 w-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] text-fg">{disruption.title}</span>
                      <span className="mt-0.5 block text-meta text-muted">
                        {SEVERITY_LABELS[exposure.severity]} exposure,{' '}
                        {CONFIDENCE_LABELS[exposure.confidence].toLowerCase()}
                        {formatShortDate(exposure.asOf)
                          ? `, as of ${formatShortDate(exposure.asOf)}`
                          : ''}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-snug text-muted">
                        {exposure.mechanism}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/**
 * The table view. Always available, never behind a toggle that could be missed:
 * it is the version that works when colour does not, and the one that shows the
 * source count behind every claim.
 */
function ExposureTable({ matrix }: { matrix: ExposureMatrix }) {
  return (
    <details className="border border-hairline bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-[0.9375rem] text-fg">
        Every assessment as a table — {matrix.exposureCount}{' '}
        {matrix.exposureCount === 1 ? 'claim' : 'claims'} across {matrix.entityCount}{' '}
        {matrix.entityCount === 1 ? 'name' : 'names'}
      </summary>
      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full min-w-[48rem] border-collapse text-left text-meta">
          <thead>
            <tr className="border-b border-rule text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">Company or sector</th>
              <th scope="col" className="py-2 pr-4 font-normal">Disruption</th>
              <th scope="col" className="py-2 pr-4 font-normal">Severity</th>
              <th scope="col" className="py-2 pr-4 font-normal">Confidence</th>
              <th scope="col" className="py-2 pr-4 font-normal">As of</th>
              <th scope="col" className="py-2 pr-4 font-normal">Mechanism</th>
              <th scope="col" className="py-2 font-normal">Sources</th>
            </tr>
          </thead>
          <tbody>
            {matrix.all.map(({ disruption, exposure }) => (
              <tr
                key={`${disruption.id}-${exposure.entity.id}`}
                className="border-b border-hairline align-top"
              >
                <td className="py-2.5 pr-4 text-fg">{exposure.entity.name}</td>
                <td className="py-2.5 pr-4 text-muted">{disruption.title}</td>
                <td className="py-2.5 pr-4 text-fg">{SEVERITY_LABELS[exposure.severity]}</td>
                <td className="py-2.5 pr-4 text-muted">
                  {CONFIDENCE_LABELS[exposure.confidence]}
                </td>
                <td data-numeric className="py-2.5 pr-4 text-muted">
                  {formatShortDate(exposure.asOf) ?? '—'}
                </td>
                <td className="max-w-[24rem] py-2.5 pr-4 text-muted">{exposure.mechanism}</td>
                <td data-numeric className="py-2.5 text-muted">
                  {exposure.sources.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EmptyChart() {
  return (
    <div className="border border-hairline bg-surface p-7 sm:p-10">
      <p className="max-w-measure text-muted">
        Nothing is in the register yet, so there is nothing to chart. This grid fills in as
        disruptions are tracked — and a cell only appears once the assessment behind it has a
        stated mechanism, a confidence level, a date and a source.
      </p>
    </div>
  );
}
