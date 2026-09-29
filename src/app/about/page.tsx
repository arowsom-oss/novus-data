import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { NeedsInput } from '@/components/needs-input';
import { PageHeader } from '@/components/page-header';
import { SubscribePanel } from '@/components/subscribe-panel';
import { MailLink, TextLink } from '@/components/text-link';
import {
  formatAuthorNames,
  hasCoAuthors,
  namedAuthors,
  publication,
} from '@/config/publication';
import {
  CONFIDENCES,
  CONFIDENCE_LABELS,
  CONFIDENCE_NOTES,
  SEVERITIES,
  SEVERITY_LABELS,
  STALE_AFTER_DAYS,
} from '@/lib/disruptions/types';
import { absoluteUrl, env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'About',
  description: `Who writes ${publication.name}, what it covers and how each issue is produced.`,
  alternates: { canonical: absoluteUrl('/about') },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader width="reading" title={`About ${publication.name}`} lede={publication.description} />

      <Container width="reading" className="mt-14 flex flex-col gap-14">
        <Section heading="Who it is for">
          <p>{publication.positioning}</p>
          <p>
            It is written for {publication.primaryReader}. It is also read by{' '}
            {joinWithAnd(publication.secondaryReaders)}.
          </p>
        </Section>

        <Section heading="What it covers">
          <p>
            Novus Data follows the physical and regulatory machinery of trade: shipping and
            freight, chokepoints, ports, trade policy, concentrated industrial inputs, the energy
            costs attached to moving goods, and the economic releases that describe all of it.
          </p>
          <p>
            What is going wrong at any moment is kept in{' '}
            <TextLink href="/disruptions">the register</TextLink>, and{' '}
            <TextLink href="/exposure">the exposure chart</TextLink> maps each entry to the
            companies and sectors it reaches. {publication.newsletter.name} summarises the
            movement in both by email.
          </p>
          <p>
            <TextLink standalone href="/coverage">
              Each topic is set out in full, with why it matters
            </TextLink>
            .
          </p>
        </Section>

        <Section heading="How it is produced" id="method">
          {publication.methodology.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          {publication.cadence ? <p>Novus Data is published {publication.cadence}.</p> : null}

          {/* The standard itself, stated rather than gestured at. A reader who
              wants to know whether to trust the chart should be able to find
              out exactly what it takes for something to appear on it. */}
          <div className="border-t border-hairline pt-6">
            <h3 className="text-[1.0625rem] font-medium text-fg">
              What it takes to appear on the exposure chart
            </h3>
            <p className="mt-3">
              Naming a company against a problem is a claim someone may act on, so every one of
              them has to carry four things. An assessment missing any of them is not published —
              the site drops it when the page is built, rather than leaving it to editorial
              discretion.
            </p>
            {/* An unordered list on purpose: these are four requirements that
                all apply at once, not four steps. Numbering a set implies a
                sequence that is not there. */}
            <ul className="mt-4 flex flex-col gap-3">
              {[
                ['A mechanism', 'The sentence explaining how the disruption reaches that company. “Affected” is not a finding.'],
                ['A confidence level', 'How well established the assessment is, stated on the chart itself.'],
                ['A date', 'When the assessment was last true, shown on every cell and every entry.'],
                ['A source', 'At least one, with a publisher and a link you can follow.'],
              ].map(([term, detail]) => (
                <li key={term} className="border-l-2 border-accent pl-4">
                  <span className="text-fg">{term}.</span> {detail}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-hairline pt-6">
            <h3 className="text-[1.0625rem] font-medium text-fg">What the confidence levels mean</h3>
            <dl className="mt-4 flex flex-col gap-3">
              {CONFIDENCES.map((confidence) => (
                <div key={confidence} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="min-w-[7rem] text-fg">{CONFIDENCE_LABELS[confidence]}</dt>
                  <dd>{CONFIDENCE_NOTES[confidence]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4">
              Severity is a three-step scale — {SEVERITIES.map((s) => SEVERITY_LABELS[s].toLowerCase()).join(', ')} — and no finer.
              A more granular scale would imply a precision that reading public sources cannot
              support.
            </p>
          </div>

          <div className="border-t border-hairline pt-6">
            <h3 className="text-[1.0625rem] font-medium text-fg">How old is too old</h3>
            <p className="mt-3">
              Every register entry carries the date it was last reviewed. An entry not reviewed
              within <span data-numeric>{STALE_AFTER_DAYS}</span> days says so on its own page
              rather than presenting itself as current. The review date is the figure to trust:
              it is a fact about when the work was done, and it does not go out of date the way a
              relative &ldquo;three days ago&rdquo; would.
            </p>
          </div>

          <div className="border-t border-hairline pt-6">
            <h3 className="text-[1.0625rem] font-medium text-fg" id="live">
              Live readings are not assessments
            </h3>
            <p className="mt-3">
              The <TextLink href="/monitor">monitor</TextLink> shows raw readings from public
              feeds, re-read every fifteen minutes: where news reporting of strikes, blockades,
              sanctions and fighting is running above its own normal, ships heard at chokepoints,
              natural hazards, port wind and energy prices. Each carries the name of its source, a
              link to it, and the time the <em>source</em> produced the data, which is not the same
              as when the page was built. Each is marked delayed or stale against that
              source&rsquo;s own normal update cycle. A feed that fails shows as unavailable, with
              the reason, and nothing is drawn in its place.
            </p>
            <p className="mt-3">
              &ldquo;Above normal&rdquo; is measured, not judged: a place&rsquo;s share of all
              reporting in the last three hours against its share in the same hours on each of the
              previous seven days. It counts reporting, not events. A place counts only reporting
              placed within its own stated radius, drawn to leave out large cities whose news is
              not about it, and a city with no measurable normal is listed but never flagged.
              Flags are published rules
              firing on readings — every rule is printed on the monitor — and a flag is a reason to
              look, not a finding.
            </p>
            <p className="mt-3">
              None of it feeds the register or the exposure chart automatically. A reading becomes
              a register entry only when it has been read, explained and sourced to the standard
              above.
            </p>
          </div>
        </Section>

        <Section heading="Corrections" id="corrections">
          {publication.corrections.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </Section>

        <Section heading="Who writes it">
          {formatAuthorNames() ? (
            <>
              <p>
                Novus Data is written by {formatAuthorNames()}.{' '}
                {hasCoAuthors()
                  ? 'Every entry in the register says which of us recorded it, and the review date is when that person last checked it.'
                  : 'I research and write every issue.'}
              </p>
              {/* One block per author, so a credential is attached to the person
                  it belongs to rather than pooled into an anonymous list. */}
              {namedAuthors().map((author) =>
                author.credentials.length > 0 ? (
                  <div
                    key={author.id}
                    className="flex flex-col gap-2 border-t border-hairline pt-5"
                  >
                    {hasCoAuthors() ? (
                      <p className="text-meta font-medium text-fg">{author.name}</p>
                    ) : null}
                    <ul className="flex list-none flex-col gap-2">
                      {author.credentials.map((fact) => (
                        <li key={fact} className="text-muted">
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </>
          ) : (
            <p>
              Novus Data is written by <NeedsInput label="author name" />. Nothing is stated here
              about the author until there is something verifiable to state.
            </p>
          )}
        </Section>

        <Section heading="Contact">
          {env.contactEmail ? (
            <p>
              Corrections, questions and sources are welcome at{' '}
              <MailLink email={env.contactEmail} />.
              Corrections are the most useful thing you can send.
            </p>
          ) : (
            <p>
              <TextLink href="/contact">Contact details</TextLink> are on their own page.
            </p>
          )}
        </Section>
      </Container>

      <Container width="reading" className="mt-16">
        <SubscribePanel />
      </Container>
    </>
  );
}

function Section({
  heading,
  id,
  children,
}: {
  heading: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <h2 className="text-heading font-semibold text-fg">{heading}</h2>
      <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">{children}</div>
    </section>
  );
}

/** "a, b and c" — no Oxford comma, matching the rest of the site's prose. */
function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
