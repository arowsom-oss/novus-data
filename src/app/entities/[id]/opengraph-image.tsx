import { ImageResponse } from 'next/og';

import { publication } from '@/config/publication';
import { getEntityProfile, listEntityIds } from '@/lib/disruptions';
import { SEVERITY_LABELS } from '@/lib/disruptions/types';
import { formatLongDate } from '@/lib/format';
import { ogColors, ogSize, cardFonts } from '@/lib/og';

export const alt = `A tracked company or sector from ${publication.name}`;
export const size = ogSize;
export const contentType = 'image/png';

/**
 * A card per entity. An entity page is the most likely thing to be shared —
 * somebody sends a colleague the page for a name they both hold — and without
 * this the link would fall back to the generic site card, which says nothing
 * about which name is being sent.
 *
 * The card states the count and the strongest assessment, never a synthesised
 * score, for the same reason the page itself does not: a number on a social
 * card travels further than the page it came from and is read with less care.
 */
export async function generateStaticParams() {
  const ids = await listEntityIds();
  return ids.map((id) => ({ id }));
}

export default async function EntityOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getEntityProfile(id);

  const title = profile?.entity.name ?? publication.name;
  const subtitle = profile
    ? [profile.entity.ticker, profile.entity.kind === 'sector' ? 'Sector' : profile.entity.sector]
        .filter(Boolean)
        .join(' · ')
    : null;
  const count = profile?.claims.length ?? 0;
  const worst = profile?.worstSeverity ? SEVERITY_LABELS[profile.worstSeverity] : null;
  const assessed = formatLongDate(profile?.lastAssessedAt ?? undefined);

  const titleSize = title.length > 90 ? 50 : title.length > 55 ? 62 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: ogColors.ink,
          padding: '64px 80px',
          fontFamily: 'IBM Plex Sans',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: ogColors.muted,
              letterSpacing: '-0.01em',
            }}
          >
            {publication.name}
          </div>
          <div style={{ width: 72, height: 3, backgroundColor: ogColors.accent, marginTop: 22 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.14,
              color: ogColors.text,
              letterSpacing: '-0.022em',
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: 'flex', fontSize: 28, color: ogColors.muted, marginTop: 20 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* The metadata row is the card's figures, so it takes Plex Mono — the
            same rule the page applies to every date and count (§9). It is what
            makes a card look like it came from this site. */}
        <div
          style={{
            display: 'flex',
            gap: 44,
            fontSize: 24,
            color: ogColors.muted,
            fontFamily: 'IBM Plex Mono',
          }}
        >
          <div style={{ display: 'flex' }}>
            {count === 0
              ? 'No open disruption'
              : `${count} ${count === 1 ? 'disruption reaches it' : 'disruptions reach it'}`}
          </div>
          {worst ? <div style={{ display: 'flex' }}>{worst} at strongest</div> : null}
          {assessed ? <div style={{ display: 'flex' }}>Assessed {assessed}</div> : null}
        </div>
      </div>
    ),
    { ...size, fonts: cardFonts() },
  );
}
