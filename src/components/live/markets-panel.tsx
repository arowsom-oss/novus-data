import { LiveAge } from '@/components/live/live-age';
import { PriceChart } from '@/components/live/price-chart';
import { ExternalLink } from '@/components/text-link';
import { formatPrice, formatSignedPct, formatUtcDateOnly } from '@/lib/live/display';
import type { FredData, QuotesData } from '@/lib/live/types';
import { PRICE_UNIT_LABELS } from '@/lib/live/types';

/**
 * Energy prices and the dollar: one small multiple per series.
 *
 * Each card leads with the latest value and its date — the date is part of
 * the number, because these are daily settlements, not a ticker — then the
 * change over a week and a month, then six months of shape. Changes are
 * written with a real minus sign and never coloured red or green: colour
 * would make a direction look like a verdict.
 */
export function EnergyPanel({ data }: { data: FredData }) {
  return (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {data.series.map((series) => (
        <figure key={series.id}>
          <figcaption>
            <span className="block text-[0.9375rem] font-semibold text-fg">{series.label}</span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span data-numeric className="text-[1.375rem] font-semibold leading-none text-fg">
                {formatPrice(series.latest.value, series.unit)}
              </span>
              <span className="text-meta text-muted">
                {PRICE_UNIT_LABELS[series.unit]}, <time dateTime={series.latest.date}>{formatUtcDateOnly(series.latest.date)}</time>
              </span>
            </span>
            <span className="mt-1 block text-meta text-muted">
              <span data-numeric className="text-fg">{formatSignedPct(series.changeWeek)}</span> on the week ·{' '}
              <span data-numeric className="text-fg">{formatSignedPct(series.changeMonth)}</span> on the month
            </span>
          </figcaption>
          <div className="mt-3">
            <PriceChart label={series.label} unit={series.unit} points={series.points} />
          </div>
          <p className="mt-2 text-meta text-muted">
            {series.origin}, via <ExternalLink href={series.sourceUrl}>FRED ({series.id})</ExternalLink>.{' '}
            {series.cadence === 'weekly' ? 'Weekly.' : 'Daily.'}
          </p>
        </figure>
      ))}
    </div>
  );
}

/** Share prices, when a licensed key is configured. A table: the values are what matters. */
export function QuotesTable({ data }: { data: QuotesData }) {
  return (
    <>
      <table className="w-full max-w-[48rem] border-collapse text-meta">
        <caption className="sr-only">Last trade price and change against the previous close.</caption>
        <thead>
          <tr className="border-b border-rule text-left text-muted">
            <th scope="col" className="py-2 pr-4 font-normal">Security</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Last</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">vs previous close</th>
            <th scope="col" className="hidden py-2 font-normal sm:table-cell">Price time</th>
          </tr>
        </thead>
        <tbody>
          {data.quotes.map((quote) => (
            <tr key={quote.symbol} className="border-b border-hairline">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                <span data-numeric className="text-fg">{quote.symbol}</span>
                <span className="block text-muted">{quote.label}</span>
              </th>
              <td className="py-2 pr-4 text-right text-fg">
                <span data-numeric>{formatPrice(quote.price, 'usd')}</span>
              </td>
              <td className="py-2 pr-4 text-right text-fg">
                <span data-numeric>{formatSignedPct(quote.changePct)}</span>
              </td>
              <td className="hidden py-2 text-muted sm:table-cell">
                <LiveAge at={quote.at} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.missing.length > 0 ? (
        <p className="mt-2 text-meta text-muted">
          No price returned for: <span data-numeric>{data.missing.join(', ')}</span>.
        </p>
      ) : null}
    </>
  );
}
