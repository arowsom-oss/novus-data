import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { SubscribePanel } from '@/components/subscribe-panel';
import { TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { absoluteUrl } from '@/lib/env';
import { formatLongDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Alerts',
  description: `${publication.alerts.name}: planned notifications for changes in the disruption register.`,
  alternates: { canonical: absoluteUrl('/alerts') },
};

/**
 * The alerts app does not exist yet. This page says so in the first sentence.
 *
 * Announcing an unbuilt product as though it shipped is the fastest way to lose
 * the reader this site is written for, so the copy is written in the future
 * tense throughout and there is no waiting-list form — the email briefing is
 * the channel that actually exists today.
 */
export default function AlertsPage() {
  const available = formatLongDate(publication.alerts.availableFrom);

  return (
    <>
      <PageHeader
        width="reading"
        title={publication.alerts.name}
        lede="Notifications when something in the register changes. Not built yet — here is what it will be, and what it will not be."
      />

      <Container width="reading" className="mt-14 flex flex-col gap-12">
        <section>
          <h2 className="text-heading font-semibold text-fg">What it will do</h2>
          <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">
            <p>
              The register on this site already records what is going wrong and which companies it
              reaches. Alerts will tell you when that changes — a new disruption opens, one you
              follow escalates, or an assessment against a company you hold is revised.
            </p>
            <p>
              The first version will notify on facts this site can already prove: a new entry in
              the register, a change of status, or a new company added to a disruption. Anything
              derived — a threshold crossed, a forecast — comes later, if at all, and only once
              the underlying record has been visibly right for a while.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-heading font-semibold text-fg">What it will not do</h2>
          <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">
            <p>
              It will not send trade signals, price targets or recommendations. It is a change
              notification on a public record, and the record is analysis and commentary, not
              investment advice.
            </p>
            <p>
              It will not be noisy by default. A notification is a much stronger claim on your
              attention than an email, and an alert that turns out to be stale costs more trust
              than the same error inside a written briefing. That argues for a narrow, quiet first
              version.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-heading font-semibold text-fg">Privacy</h2>
          <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">
            <p>
              This site currently stores nothing about you — no analytics, no cookies of its own.
              An alerts app cannot make that claim, because it has to keep a device identifier and
              your preferences somewhere.
            </p>
            <p>
              When alerts ship, <TextLink href="/privacy">the privacy page</TextLink> will be
              rewritten in the same release to describe exactly what is held and why — not
              afterwards.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-heading font-semibold text-fg">Until then</h2>
          <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">
            {available ? (
              <p>
                Alerts are expected from <time>{available}</time>.
              </p>
            ) : (
              <p>
                There is no announced date. When there is one, it will be stated here and in the
                briefing rather than implied.
              </p>
            )}
            <p>
              The email briefing is the channel that exists today, and subscribers will hear about
              alerts first.
            </p>
          </div>
        </section>
      </Container>

      <Container width="reading" className="mt-6">
        <SubscribePanel heading="Get the briefing while alerts are built" />
      </Container>
    </>
  );
}
