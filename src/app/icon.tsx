import { ImageResponse } from 'next/og';

import { ogColors, cardFonts } from '@/lib/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * The favicon, set from the same typographic treatment as the wordmark. It is
 * a stand-in: when the real Novus Data logo file is supplied it replaces this
 * and apple-icon.tsx. The existing logo is deliberately not approximated here.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ogColors.ink,
          color: ogColors.text,
          fontFamily: 'IBM Plex Sans',
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: '-0.03em',
        }}
      >
        N
      </div>
    ),
    { ...size, fonts: cardFonts() },
  );
}
