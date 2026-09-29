'use client';

import { useState, type KeyboardEvent, type PointerEvent } from 'react';

import { formatPrice, formatUtcDateOnly } from '@/lib/live/display';
import type { PricePoint, PriceUnit } from '@/lib/live/types';
import { PRICE_UNIT_LABELS } from '@/lib/live/types';

/**
 * One price series over roughly six months: a sparkline with a crosshair.
 *
 * ---------------------------------------------------------------------------
 * FORM
 *
 * One series per chart, so no legend — the heading names it. Several series
 * are several charts rather than lines on one axis, because they are in
 * different units (dollars a barrel, dollars per million Btu, an index), and
 * one axis for all of them would be meaningless; two axes would be worse.
 *
 * The scale is the series' own low and high over the window, labelled on the
 * right (the financial convention). A price level is not a magnitude
 * measured from zero, so a zero baseline would flatten every move into a
 * straight line. The labels say exactly what the top and bottom are.
 *
 * The line is --accent (3.1:1 on --ink, a structural non-text mark, which is
 * its sanctioned use) and the latest point --accent-text. Amber is never used:
 * it is reserved for the register's "active" status. Hand-written SVG, no
 * chart library (§7). Keyboard: arrow keys, Home and End move the crosshair.
 * ---------------------------------------------------------------------------
 */
export function PriceChart({
  label,
  unit,
  points,
}: {
  label: string;
  unit: PriceUnit;
  points: PricePoint[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.abs(high) || 1;
  const count = points.length;
  const x = (index: number) => (index / (count - 1)) * 100;
  const y = (value: number) => (1 - (value - low) / span) * 100;

  const path = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(3)} ${y(p.value).toFixed(3)}`)
    .join(' ');

  const latestIndex = count - 1;
  const latest = points[latestIndex];
  const shown = active !== null ? points[active] : null;

  function moveTo(index: number) {
    setActive(Math.max(0, Math.min(count - 1, index)));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    setKeyboard(false);
    moveTo(Math.round(((event.clientX - rect.left) / rect.width) * (count - 1)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? latestIndex;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: count - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setKeyboard(true);
      moveTo(moves[event.key]);
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  }

  const tipX = active !== null ? x(active) : 0;
  const tipAnchor = tipX < 22 ? 'translate-x-0' : tipX > 78 ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-x-2">
        <div
          role="group"
          tabIndex={0}
          aria-label={`${label}: daily values from ${formatUtcDateOnly(points[0].date)} to ${formatUtcDateOnly(latest.date)}. Use the arrow keys to read each observation.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => {
            if (active === null) setActive(latestIndex);
          }}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative h-16 cursor-crosshair touch-pan-y"
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <line x1="0" x2="100" y1="0" y2="0" stroke="var(--border)" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2="100" y1="100" y2="100" stroke="var(--border)" vectorEffect="non-scaling-stroke" />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span
            aria-hidden="true"
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-link ring-2 ring-ink"
            style={{ left: `${x(latestIndex)}%`, top: `${y(latest.value)}%` }}
          />

          {shown && active !== null ? (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-[color-mix(in_srgb,var(--text-muted)_55%,transparent)]"
                style={{ left: `${x(active)}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-ink"
                style={{ left: `${x(active)}%`, top: `${y(shown.value)}%` }}
              />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-[calc(100%+0.5rem)] z-10 w-max ${tipAnchor} rounded-[2px] border border-rule bg-surface-2 px-2.5 py-1.5 text-meta shadow-[0_8px_24px_rgb(0_0_0/0.5)]`}
                style={{ left: `${x(active)}%` }}
              >
                <span data-numeric className="block font-semibold text-fg">
                  {formatPrice(shown.value, unit)}
                </span>
                <span className="block text-muted">
                  <time dateTime={shown.date}>{formatUtcDateOnly(shown.date)}</time>
                </span>
              </span>
            </>
          ) : null}
        </div>

        {/* The window's own high and low, on the right as a financial chart carries them. */}
        <div aria-hidden="true" className="flex h-16 flex-col justify-between text-[0.6875rem] leading-none text-muted">
          <span data-numeric className="-translate-y-1/2">{formatPrice(high, unit)}</span>
          <span data-numeric className="translate-y-1/2">{formatPrice(low, unit)}</span>
        </div>
      </div>

      <div aria-hidden="true" className="mt-1.5 flex justify-between pr-12 text-[0.6875rem] text-muted">
        <time dateTime={points[0].date}>{formatUtcDateOnly(points[0].date)}</time>
        <time dateTime={latest.date}>{formatUtcDateOnly(latest.date)}</time>
      </div>
      <p className="sr-only">{PRICE_UNIT_LABELS[unit]}</p>

      {/* Announced only for keyboard movement. */}
      <p className="sr-only" aria-live="polite">
        {keyboard && shown ? `${formatUtcDateOnly(shown.date)}: ${formatPrice(shown.value, unit)}` : ''}
      </p>
    </div>
  );
}
