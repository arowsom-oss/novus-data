import { ImageResponse } from 'next/og';

import { publication } from '@/config/publication';
import { ogColors, ogSize, cardFonts } from '@/lib/og';

export const alt = `${publication.name} — ${publication.description}`;
export const size = ogSize;
export const contentType = 'image/png';

/** The default social card: the wordmark and the one-sentence description. */
export default function OpengraphImage() {
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
          padding: '72px 80px',
          fontFamily: 'IBM Plex Sans',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, fontWeight: 600, color: ogColors.text, letterSpacing: '-0.02em' }}>
            {publication.name}
          </div>
          <div style={{ width: 96, height: 3, backgroundColor: ogColors.accent, marginTop: 28 }} />
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.22,
            color: ogColors.text,
            letterSpacing: '-0.02em',
            maxWidth: 940,
          }}
        >
          {publication.description}
        </div>
      </div>
    ),
    { ...size, fonts: cardFonts() },
  );
}
