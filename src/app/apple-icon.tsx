import { ImageResponse } from 'next/og';

import { ogColors, cardFonts } from '@/lib/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          fontSize: 116,
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
