import { ImageResponse } from 'next/og';

import { publication } from '@/config/publication';
import { cardFonts, ogColors, ogSize } from '@/lib/og';

/**
 * The social card for a post — a briefing, article or long-term review —
 * generated at build time alongside its page. `label` is the issue number
 * or the kind, and sits in the figures row beside the date.
 */
export function postCardImage({ title, label, date }: { title: string; label: string | null; date: string | null }) {
  // Long titles get a smaller size rather than overflowing the card.
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
          <div style={{ fontSize: 30, fontWeight: 600, color: ogColors.muted, letterSpacing: '-0.01em' }}>
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
          {label ? <div style={{ display: 'flex' }}>{label}</div> : null}
          {date ? <div style={{ display: 'flex' }}>{date}</div> : null}
        </div>
      </div>
    ),
    { ...ogSize, fonts: cardFonts() },
  );
}
