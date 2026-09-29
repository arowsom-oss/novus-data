import clsx from 'clsx';

import {
  CONFIDENCE_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type Confidence,
  type Severity,
} from '@/lib/disruptions/types';

const SWATCH: Record<string, string> = {
  low: 'bg-sev-low',
  moderate: 'bg-sev-moderate',
  high: 'bg-sev-high',
};

/**
 * Always present. A sequential ramp with no key is a picture, not a chart.
 * It carries both channels the chart uses: fill for severity, edge for
 * confidence.
 */
export function SeverityLegend() {
  return (
    <div className="flex flex-col gap-4 border-t border-hairline pt-5 sm:flex-row sm:gap-12">
      <div>
        <p className="text-meta text-muted">Severity of exposure</p>
        <ul className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {SEVERITIES.map((severity) => (
            <li key={severity} className="flex items-center gap-2">
              <span
                className={`h-3.5 w-6 rounded-[2px] ${SWATCH[severity]}`}
                aria-hidden="true"
              />
              <span className="text-meta text-fg">{SEVERITY_LABELS[severity]}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span
              className="h-3.5 w-6 rounded-[2px] border border-hairline"
              aria-hidden="true"
            />
            <span className="text-meta text-muted">No assessment</span>
          </li>
        </ul>
      </div>

      <div>
        <p className="text-meta text-muted">Confidence</p>
        <ul className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <li className="flex items-center gap-2">
            <span
              className="h-3.5 w-6 rounded-[2px] border border-solid border-muted"
              aria-hidden="true"
            />
            <span className="text-meta text-fg">{CONFIDENCE_LABELS.reported}</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="h-3.5 w-6 rounded-[2px] border border-dashed border-muted"
              aria-hidden="true"
            />
            <span className="text-meta text-fg">Inferred or estimated</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * One severity mark outside the chart: a row's strongest assessment, one
 * exposure's level. It is the chart's own `.exposure-cell`, so it takes the
 * same texture channel under forced colours and print. Decorative — every
 * use sits beside the level in words.
 */
export function SeveritySwatch({
  severity,
  confidence,
  className = 'h-3.5 w-6',
}: {
  severity: Severity;
  confidence?: Confidence;
  className?: string;
}) {
  return (
    <span
      className={clsx('exposure-cell !min-h-0', className)}
      data-severity={severity}
      data-confidence={confidence}
      aria-hidden="true"
    />
  );
}
