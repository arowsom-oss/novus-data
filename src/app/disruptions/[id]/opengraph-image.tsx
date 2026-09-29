import { ImageResponse } from 'next/og';

import { publication } from '@/config/publication';
import { getDisruption, listDisruptionIds } from '@/lib/disruptions';
import { STATUS_LABELS } from '@/lib/disruptions/types';
import { formatLongDate } from '@/lib/format';
import { ogColors, ogSize, cardFonts } from '@/lib/og';

export const alt = `A tracked disruption from ${publication.name}`;
export const size = ogSize;
export const contentType = 'image/png';

/**
 * A card per register entry. Register entries are the site's most shareable
 * content, and without this a shared link fell back to the generic site card —
 * which told a reader nothing about which disruption they were being sent.
 */
export async function generateStaticParams() {
  const ids = await listDisruptionIds();
  return ids.map((id) => ({ id }));
}

export default async function DisruptionOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const disruption = await getDisruption(id);

  const title = disruption?.title ?? publication.name;
  const reviewed = formatLongDate(disruption?.updatedAt);
  const status = disruption ? STATUS_LABELS[disruption.status] : null;
  const reach = disruption?.exposures.length ?? 0;

  // Long titles step down rather than overflowing the card.
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
          {status ? <div style={{ display: 'flex' }}>{status}</div> : null}
          {reach > 0 ? (
            <div style={{ display: 'flex' }}>
              {reach} {reach === 1 ? 'name affected' : 'names affected'}
            </div>
          ) : null}
          {reviewed ? <div style={{ display: 'flex' }}>Reviewed {reviewed}</div> : null}
        </div>
      </div>
    ),
    { ...size, fonts: cardFonts() },
  );
}
