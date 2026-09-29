import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Assessment } from '@/components/assessment';
import { Container } from '@/components/container';
import { PrintPermalink } from '@/components/print-permalink';
import { SeveritySwatch } from '@/components/severity-legend';
import { StatusBadge } from '@/components/status-badge';
import { TextLink } from '@/components/text-link';
import type { EntityClaim } from '@/lib/disruptions';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STALE_AFTER_DAYS,
  getEntityProfile,
  isStale,
  listEntityIds,
} from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';
import { formatLongDate } from '@/lib/format';

export async function generateStaticParams() {
  const ids = await listEntityIds();
  return ids.map((id) => ({ id }));
}

export const dynamicParams = false;

export async function generateMetadata(props: PageProps<'/entities/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  const profile = await getEntityProfile(id);
  if (!profile) return { title: 'Not found' };

  const { entity, claims } = profile;
  const description =
    claims.length > 0
      ? `${claims.length} tracked ${claims.length === 1 ? 'disruption reaches' : 'disruptions reach'} ${entity.name}. Every assessment states its mechanism, its confidence and its source.`
      : `No open disruption currently reaches ${entity.name}. Past assessments are kept on the record.`;

  return {
    title: entity.name,
    description,
    alternates: { canonical: absoluteUrl(`/entities/${entity.id}`) },
    openGraph: {
      type: 'article',
      title: entity.name,
      description,
      url: absoluteUrl(`/entities/${entity.id}`),
    },
  };
}

/**
 * One company or sector, and everything the register says reaches it.
 *
 * This is the most consequential page on the site: it carries a real,
 * named business in its <h1> and asserts that trade problems reach it. So it
 * holds to the same standard the chart does, and states it visibly —
 * every claim below shows its mechanism, its confidence, the date it was last
 * true and the sources behind it, because the layer will not load an exposure
 * that lacks any of them.
 *
 * What it deliberately does NOT do is reduce those claims to a single number.
 * A composite "risk score" would be the one invented figure on a site whose
 * whole argument is that it publishes none — it would look like data, travel
 * like data, and be traceable to nothing. The strongest single claim is shown
 * instead, which is a real maximum rather than a synthesised total.
 */
export default async function EntityPage(props: PageProps<'/entities/[id]'>) {
  const { id } = await props.params;
  const profile = await getEntityProfile(id);
  if (!profile) notFound();

  const { entity, claims, resolved, worstSeverity, lastAssessedAt } = profile;
  const assessed = lastAssessedAt ? formatLongDate(lastAssessedAt) : null;
  const stale = lastAssessedAt ? isStale(lastAssessedAt) : false;

  return (
    <article>
      <Container width="reading" className="pt-10 sm:pt-14">
        <p className="text-meta text-muted">
          <TextLink href="/entities" className="no-underline hover:underline">
            Companies and sectors
          </TextLink>
        </p>

        <h1 className="mt-6 text-title font-semibold text-fg">{entity.name}</h1>

        <p className="mt-4 text-meta text-muted">
          {entity.ticker ? (
            <>
              <span data-numeric>{entity.ticker}</span>
              {' · '}
            </>
          ) : null}
          {entity.kind === 'sector' ? 'Sector' : entity.sector}
        </p>

        <p className="mt-6 max-w-measure text-subhead text-muted">
          {claims.length > 0 ? (
            <>
              {claims.length === 1
                ? 'One tracked disruption currently reaches '
                : `${claims.length} tracked disruptions currently reach `}
              {entity.name}. Each assessment below states how.
            </>
          ) : (
            <>
              No open disruption in the register currently reaches {entity.name}.
              {resolved.length > 0 ? ' The assessments that did are kept below.' : ''}
            </>
          )}
        </p>

        {claims.length > 0 ? (
          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-3 border-t border-hairline pt-5 text-meta">
            {worstSeverity ? (
              <div>
                <dt className="text-muted">Strongest assessment</dt>
                <dd className="mt-1 flex items-center gap-2 text-fg">
                  <SeveritySwatch severity={worstSeverity} />
                  {SEVERITY_LABELS[worstSeverity]}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">Disruptions reaching it</dt>
              <dd data-numeric className="mt-1 text-fg">
                {claims.length}
              </dd>
            </div>
            {assessed ? (
              <div>
                <dt className="text-muted">Last assessed</dt>
                <dd className="mt-1 text-fg">
                  <time dateTime={lastAssessedAt ?? undefined}>{assessed}</time>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {/* Phrased against the build, not against "now": the page is static, so
            a live-sounding day count would freeze at build time and could only
            ever understate the age. */}
        {stale ? (
          <p className="mt-6 border-l-2 border-status-active pl-4 text-meta text-muted">
            Nothing here had been re-assessed for over{' '}
            <span data-numeric>{STALE_AFTER_DAYS}</span> days when this page was built, and may
            have aged further since. Trust the dates on each claim, not the freshness of the page.
          </p>
        ) : null}
      </Container>

      {claims.length > 0 ? (
        <Container width="reading" className="mt-16">
          <h2 className="text-heading font-semibold text-fg">
            How each disruption reaches {entity.name}
          </h2>
          <p className="mt-3 max-w-measure text-muted">
            Worst assessment first. &ldquo;Affected&rdquo; is not a finding, so each entry names
            the mechanism, how well established it is, when it was last true, and where it comes
            from.
          </p>
          <ul className="mt-8 flex flex-col">
            {claims.map((claim) => (
              <ClaimEntry key={claim.disruption.id} claim={claim} />
            ))}
          </ul>
        </Container>
      ) : null}

      {resolved.length > 0 ? (
        <Container width="reading" className="mt-16">
          <h2 className="text-heading font-semibold text-fg">Resolved</h2>
          <p className="mt-3 max-w-measure text-muted">
            These disruptions reached {entity.name} and have since resolved. They stay on the
            record: an assessment that simply vanishes is indistinguishable from one that was
            wrong.
          </p>
          <ul className="mt-8 flex flex-col">
            {resolved.map((claim) => (
              <ClaimEntry key={claim.disruption.id} claim={claim} />
            ))}
          </ul>
        </Container>
      ) : null}

      <Container width="reading" className="mt-16">
        <p className="max-w-measure text-muted">
          <TextLink href="/exposure">See {entity.name} alongside every other tracked name</TextLink>
          , or read{' '}
          <TextLink href="/about#method">the standard every assessment here has to meet</TextLink>.
        </p>
      </Container>

      <Container width="reading" className="mt-10">
        <PrintPermalink path={`/entities/${entity.id}`} className="mb-2" />
        <p className="max-w-measure text-meta text-muted">
          Novus Data publishes analysis and commentary, not investment advice. Nothing here is a
          recommendation to buy or sell any security, and an assessment that a disruption reaches a
          company is not a claim about that company&rsquo;s financial condition.
        </p>
      </Container>
    </article>
  );
}

function ClaimEntry({ claim }: { claim: EntityClaim }) {
  const { disruption, exposure } = claim;

  return (
    <li id={`disruption-${disruption.id}`} className="border-t border-hairline py-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatusBadge status={disruption.status} />
        <span className="kicker kicker-muted">{CATEGORY_LABELS[disruption.category]}</span>
      </div>

      {/* inline-flex + min-h-11: a heading that is also the block's primary
          link is a standalone control, not inline prose, so it carries the
          site's 44px target like every other one. */}
      <h3 className="mt-2 text-[1.0625rem] font-medium">
        <TextLink
          standalone
          href={`/disruptions/${disruption.id}`}
          className="no-underline hover:underline"
        >
          {disruption.title}
        </TextLink>
      </h3>

      <Assessment exposure={exposure} />
    </li>
  );
}
