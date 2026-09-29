import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/container';
import { SeveritySwatch } from '@/components/severity-legend';
import { TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import type { EntityProfile } from '@/lib/disruptions';
import { SEVERITY_LABELS, listEntities } from '@/lib/disruptions';
import { absoluteUrl } from '@/lib/env';
import { formatShortDate } from '@/lib/format';

const title = 'Companies and sectors';
const description =
  'Every company and sector the register currently reaches, and how hard each one is reached.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/entities') },
  openGraph: { title, description, url: absoluteUrl('/entities') },
};

export default async function EntitiesPage() {
  const entities = await listEntities();
  const open = entities.filter((profile) => profile.claims.length > 0);
  const cleared = entities.filter((profile) => profile.claims.length === 0);

  // Grouped by sector rather than listed flat: a reader who holds one shipping
  // name almost always wants to see the rest of the sector beside it.
  const sectors = new Map<string, EntityProfile[]>();
  for (const profile of open) {
    const bucket = sectors.get(profile.entity.sector);
    if (bucket) bucket.push(profile);
    else sectors.set(profile.entity.sector, [profile]);
  }
  const grouped = [...sectors.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <Container className="pt-10 sm:pt-14">
        <h1 className="text-title font-semibold text-fg">{title}</h1>
        <p className="mt-5 max-w-measure text-subhead text-muted">{description}</p>
        <p className="mt-4 max-w-measure text-muted">
          Each name has its own page listing every disruption that reaches it, the mechanism by
          which it does, how well established that is, and the sources behind it. Nothing appears
          here that is not on the{' '}
          <TextLink href="/exposure">exposure chart</TextLink>.
        </p>
      </Container>

      {entities.length === 0 ? (
        <Container className="mt-12">
          <p className="max-w-measure text-muted">
            No company or sector is listed yet. Names appear here once a disruption in the{' '}
            <TextLink href="/disruptions">register</TextLink> is assessed as reaching them — with a
            mechanism, a confidence level, a date and a source attached to the claim.
          </p>
        </Container>
      ) : (
        <Container className="mt-14">
          {grouped.map(([sector, profiles]) => (
            <section key={sector} className="mt-12 first:mt-0">
              <h2 className="text-heading font-semibold text-fg">{sector}</h2>
              <ul className="mt-5 border-b border-hairline">
                {profiles.map((profile) => (
                  <EntityRow key={profile.entity.id} profile={profile} />
                ))}
              </ul>
            </section>
          ))}

          {cleared.length > 0 ? (
            <section className="mt-16">
              <h2 className="text-heading font-semibold text-fg">
                No longer reached
              </h2>
              <p className="mt-3 max-w-measure text-muted">
                Every disruption that reached these names has resolved. They stay listed, and their
                pages stay up, because an assessment quietly disappearing is indistinguishable from
                one that was wrong.
              </p>
              <ul className="mt-5 border-b border-hairline">
                {cleared.map((profile) => (
                  <EntityRow key={profile.entity.id} profile={profile} />
                ))}
              </ul>
            </section>
          ) : null}
        </Container>
      )}

      <Container className="mt-16">
        <p className="max-w-measure text-meta text-muted">
          {publication.disclaimer}
        </p>
      </Container>
    </>
  );
}

function EntityRow({ profile }: { profile: EntityProfile }) {
  const { entity, claims, worstSeverity, lastAssessedAt } = profile;
  const asOf = lastAssessedAt ? formatShortDate(lastAssessedAt) : null;

  return (
    <li className="border-t border-hairline">
      <Link
        href={`/entities/${entity.id}`}
        className="group grid gap-x-6 gap-y-2 px-2 py-5 transition-colors hover:bg-surface sm:grid-cols-[1fr_auto] sm:px-3"
      >
        <div className="min-w-0">
          <span className="block text-[1.0625rem] text-fg transition-colors group-hover:text-link">
            {entity.name}
          </span>
          <span className="mt-0.5 block text-meta text-muted">
            {entity.ticker ? `${entity.ticker} · ` : ''}
            {entity.kind === 'sector' ? 'Sector' : entity.sector}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          {worstSeverity ? (
            <>
              <SeveritySwatch severity={worstSeverity} />
              <span className="text-meta text-muted">
                {SEVERITY_LABELS[worstSeverity]} · <span data-numeric>{claims.length}</span>{' '}
                {claims.length === 1 ? 'disruption' : 'disruptions'}
                {asOf ? `, as of ${asOf}` : ''}
              </span>
            </>
          ) : (
            <span className="text-meta text-muted">Resolved</span>
          )}
        </div>
      </Link>
    </li>
  );
}
