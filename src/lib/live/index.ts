/**
 * The public API for live data.
 *
 * Pages import from here and never from ./sources — the same boundary the
 * other three layers keep, enforced by the same lint rule. Client components
 * import from ./types (and ./meta, ./nodes, which are equally pure) instead,
 * because this file reaches the network adapters.
 *
 * This is the fourth typed layer, and the one §14.1 anticipated: a time series
 * has a different shape, refresh cadence and failure mode from a document or a
 * tracked assessment, so it is not bolted onto either.
 */

export * from './types';
export { SOURCE_META } from './meta';
export { CHOKEPOINTS, INDUSTRIAL, PORTS, nodeById } from './nodes';
export { getLiveSourceName, readLiveSnapshot as getLiveSnapshot } from './sources';
export { deriveFlags, derivePlaces, FLAG_RULES } from './derive';
