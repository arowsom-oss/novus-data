/**
 * The securities the monitor quotes, when a licensed quote key is configured.
 *
 * Funds rather than single companies, on purpose. A fund tracking an index or
 * a freight market is market context; a hand-picked list of named companies
 * shown beside a disruption monitor reads as a claim that those companies are
 * exposed — and §6a says an exposure claim needs a mechanism, a confidence, a
 * date and a source before it appears anywhere. Companies reach the price
 * panel only one way: by being on the exposure chart, where that claim has
 * already been made and sourced. Their tickers are added automatically.
 *
 * Edit freely. A symbol the provider does not recognise is listed as
 * unavailable rather than dropped silently.
 */

export interface MarketSymbol {
  symbol: string;
  label: string;
}

export const MARKET_SYMBOLS: MarketSymbol[] = [
  { symbol: 'SPY', label: 'US large companies (S&P 500 fund)' },
  { symbol: 'IYT', label: 'US transportation companies (fund)' },
  { symbol: 'XLE', label: 'US energy companies (fund)' },
  { symbol: 'BDRY', label: 'Dry-bulk freight futures (fund)' },
  { symbol: 'SEA', label: 'Global shipping companies (fund)' },
];
