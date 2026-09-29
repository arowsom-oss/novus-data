/**
 * AISStream — vessels heard at each chokepoint during a short sample.
 *
 * ---------------------------------------------------------------------------
 * HOW THE NUMBER IS MADE, BECAUSE IT IS EASY TO MISREAD
 *
 * AISStream is a continuous WebSocket of vessel broadcasts. A page cannot hold
 * a socket open between regenerations, so each regeneration opens one,
 * subscribes to every chokepoint's box, listens for AIS_WINDOW_SECONDS, and
 * counts distinct vessels (by MMSI) heard in each box.
 *
 * The headline figure is vessels UNDERWAY — reporting at least 1 knot. That is
 * the robust one: a vessel under way broadcasts every two to ten seconds, so a
 * thirty-second window hears nearly all of them. A vessel at anchor
 * broadcasts only every three minutes, so the same window hears perhaps one in
 * six. The total including stationary vessels is therefore shown, but
 * labelled as an undercount — it is not a queue length.
 *
 * And the caveat that matters most: AISStream is fed by terrestrial receivers.
 * Coverage is good near busy coasts and thin offshore. **A zero means no
 * signal was received, not that no ship was there.** The page prints that
 * beside every zero.
 *
 * ---------------------------------------------------------------------------
 * THE KEY
 *
 * AISSTREAM_API_KEY is server-only. It is written into the subscription
 * message and nowhere else: not into a Reading, not into an error, not into
 * anything that can be serialised to the page or to /live.json. The build
 * refuses to run if it is ever prefixed NEXT_PUBLIC_ (input-ledger.ts).
 * ---------------------------------------------------------------------------
 */

import { CHOKEPOINTS, chokepointContaining } from '../nodes';
import type { AisData, ChokepointSample, Reading } from '../types';
import { LiveSourceError, isRecord, num, str } from './http';

const STREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const AIS_WINDOW_SECONDS = 30;
const CONNECT_TIMEOUT_MS = 10_000;
const UNDERWAY_KNOTS = 1;

/** What the sample produced, before it becomes a Reading. Counts only — no raw messages kept. */
export interface AisSummary {
  sampledAt: string;
  windowSeconds: number;
  latestMessageAt: string | null;
  totalMessages: number;
  perNode: Record<string, { vessels: number; underway: number; messages: number }>;
}

/** AISStream writes `time_utc` in Go's format: "2026-09-22 17:41:03.318353 +0000 UTC". */
function aisTime(value: unknown): string | null {
  const match = str(value)?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Counts messages as they arrive. Shared by the live socket and the fixtures,
 * so the fixtures exercise the real bucketing rather than a copy of it.
 */
export function createAisAccumulator() {
  const perNode = new Map<string, { mmsi: Set<string>; underway: Set<string>; messages: number }>();
  let latestMessageAt: string | null = null;
  let totalMessages = 0;

  return {
    add(message: unknown): void {
      if (!isRecord(message)) return;
      const meta = isRecord(message.MetaData) ? message.MetaData : null;
      const body = isRecord(message.Message) ? message.Message : null;
      if (!meta) return;

      const lat = num(meta.latitude);
      const lon = num(meta.longitude);
      const mmsi = num(meta.MMSI);
      if (lat === null || lon === null || mmsi === null) return;

      const node = chokepointContaining(lat, lon);
      if (!node) return;

      totalMessages += 1;
      const at = aisTime(meta.time_utc);
      if (at && (!latestMessageAt || at > latestMessageAt)) latestMessageAt = at;

      const report =
        (body && isRecord(body.PositionReport) && body.PositionReport) ||
        (body && isRecord(body.StandardClassBPositionReport) && body.StandardClassBPositionReport) ||
        null;
      const sog = report ? num(report.Sog) : null;

      const bucket = perNode.get(node.id) ?? { mmsi: new Set(), underway: new Set(), messages: 0 };
      bucket.messages += 1;
      bucket.mmsi.add(String(mmsi));
      // 102.3 is AIS's "speed not available" sentinel, not a fast ship.
      if (sog !== null && sog >= UNDERWAY_KNOTS && sog < 102.2) bucket.underway.add(String(mmsi));
      perNode.set(node.id, bucket);
    },

    summary(sampledAt: string, windowSeconds: number): AisSummary {
      return {
        sampledAt,
        windowSeconds,
        latestMessageAt,
        totalMessages,
        perNode: Object.fromEntries(
          [...perNode.entries()].map(([id, bucket]) => [
            id,
            { vessels: bucket.mmsi.size, underway: bucket.underway.size, messages: bucket.messages },
          ]),
        ),
      };
    },
  };
}

function decode(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  return null;
}

/** Open the socket, listen for the window, close it. Resolves with counts; rejects with a safe reason. */
/**
 * `url` exists only so the socket logic can be exercised against a local mock
 * server; production always uses AISStream.
 */
export function fetchAis(apiKey: string, url: string = STREAM_URL): Promise<AisSummary> {
  return new Promise((resolve, reject) => {
    const accumulator = createAisAccumulator();
    let settled = false;
    let windowTimer: ReturnType<typeof setTimeout> | undefined;

    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    const finish = (error?: LiveSourceError) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(windowTimer);
      try {
        socket.close();
      } catch {
        // Closing a socket that never opened can throw; nothing to recover.
      }
      if (error) reject(error);
      else resolve(accumulator.summary(new Date().toISOString(), AIS_WINDOW_SECONDS));
    };

    const connectTimer = setTimeout(
      () => finish(new LiveSourceError('AISStream did not accept a connection in time.')),
      CONNECT_TIMEOUT_MS,
    );

    socket.addEventListener('open', () => {
      clearTimeout(connectTimer);
      // AISStream closes a connection that has not subscribed within three
      // seconds, so the subscription goes first and immediately.
      socket.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: CHOKEPOINTS.flatMap((node) => (node.box ? [node.box] : [])),
          FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport'],
        }),
      );
      windowTimer = setTimeout(() => finish(), AIS_WINDOW_SECONDS * 1000);
    });

    socket.addEventListener('message', (event) => {
      const text = decode(event.data);
      if (!text) return;
      let message: unknown;
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      // An error object means the subscription was refused — almost always
      // the key. Its text is not echoed.
      if (isRecord(message) && 'error' in message) {
        finish(new LiveSourceError('AISStream refused the subscription. Check that AISSTREAM_API_KEY is valid.'));
        return;
      }
      accumulator.add(message);
    });

    socket.addEventListener('error', () => {
      finish(new LiveSourceError('The connection to AISStream failed.'));
    });

    socket.addEventListener('close', () => {
      // A close before the window elapsed is a failure unless we closed it.
      if (!settled) finish(new LiveSourceError('AISStream closed the connection before the sample finished.'));
    });
  });
}

export function parseAis(summary: AisSummary): Reading<AisData> {
  // Fixed order, never ranked. The page is re-read every fifteen minutes and
  // a reader scans it for change; rows that reshuffle on every update make
  // that impossible, and a ranking would also imply the boxes are comparable,
  // which uneven receiver coverage does not allow.
  const chokepoints: ChokepointSample[] = CHOKEPOINTS.map((node) => {
    const bucket = summary.perNode[node.id];
    return {
      nodeId: node.id,
      vesselsObserved: bucket?.vessels ?? 0,
      vesselsUnderway: bucket?.underway ?? 0,
      messages: bucket?.messages ?? 0,
    };
  });

  const notes = [
    `Vessels heard by terrestrial receivers during a ${summary.windowSeconds}-second sample. A zero means no signal was received, not that no ship was present.`,
    'Stationary vessels broadcast only every three minutes, so the total including them is an undercount, not a queue length.',
  ];
  if (summary.totalMessages === 0) {
    notes.push('No messages were received in any box during this sample. That usually points to the service or receivers, not to empty sea lanes.');
  }

  return {
    status: 'ok',
    source: 'ais',
    // The sample's own end time. It is true regardless of caching: the page
    // that carries it was generated from that sample.
    asOf: summary.latestMessageAt ?? summary.sampledAt,
    asOfBasis: summary.latestMessageAt ? 'latest vessel message received' : 'end of sample window',
    data: { windowSeconds: summary.windowSeconds, sampledAt: summary.sampledAt, chokepoints },
    notes,
  };
}
