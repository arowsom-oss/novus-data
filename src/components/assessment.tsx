import { SeveritySwatch } from '@/components/severity-legend';
import { SourceList } from '@/components/source-list';
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_NOTES,
  SEVERITY_LABELS,
  type Exposure,
} from '@/lib/disruptions/types';
import { formatShortDate } from '@/lib/format';

/**
 * One exposure's assessment, in the order a sceptical reader checks it: the
 * mechanism, then severity, confidence and date, then what that confidence
 * commits to, then the sources. The register entry and the entity page both
 * render it, so the four things §6a requires are laid out the same way
 * wherever a claim appears.
 */
export function Assessment({ exposure }: { exposure: Exposure }) {
  const asOf = formatShortDate(exposure.asOf);

  return (
    <>
      <p className="mt-3 max-w-measure text-muted">{exposure.mechanism}</p>

      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-meta">
        <div className="flex items-center gap-2">
          <dt className="text-muted">Severity</dt>
          <dd className="flex items-center gap-2 text-fg">
            <SeveritySwatch severity={exposure.severity} confidence={exposure.confidence} />
            {SEVERITY_LABELS[exposure.severity]}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted">Confidence</dt>
          <dd className="text-fg" title={CONFIDENCE_NOTES[exposure.confidence]}>
            {CONFIDENCE_LABELS[exposure.confidence]}
          </dd>
        </div>
        {asOf ? (
          <div className="flex items-center gap-2">
            <dt className="text-muted">As of</dt>
            <dd data-numeric className="text-fg">
              <time dateTime={exposure.asOf}>{asOf}</time>
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-3 text-meta text-muted">{CONFIDENCE_NOTES[exposure.confidence]}</p>

      <SourceList sources={exposure.sources} className="mt-4" compact />
    </>
  );
}
