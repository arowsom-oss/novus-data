import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Font data for generated images (icons and social cards).
 *
 * The TTFs are committed rather than fetched, for three reasons: the image
 * generator needs TTF or WOFF and next/font serves WOFF2; a build should not
 * depend on a third-party request succeeding; and the files are small because
 * they are the Latin subset. IBM Plex is an SIL Open Font License family, so
 * redistributing it inside this repository is permitted — the same basis on
 * which Newsreader was committed before it.
 *
 * **These must stay the same family the site sets (§9).** A social card is the
 * part of the site that travels furthest and is judged fastest, and a card in
 * a different typeface from the page it links to reads as two different
 * products. When the site's faces change, change these in the same commit.
 */
const FONT_DIR = path.join(process.cwd(), 'src', 'assets', 'fonts');

function read(file: string): Buffer {
  return readFileSync(path.join(FONT_DIR, file));
}

/**
 * The faces every generated image is drawn with.
 *
 * Satori cannot read a variable font — it throws on the `fvar` table — so
 * these are static instances, taken from Google Fonts' static endpoint and
 * checked for the absence of `fvar` before being committed. Verify the same
 * way if they are ever replaced.
 *
 * Plex Mono is here because figures on a card are set in it, exactly as they
 * are on the page: it is the detail that makes a card look like it came from
 * this site rather than from a template.
 */
export function cardFonts() {
  return [
    {
      name: 'IBM Plex Sans',
      data: read('PlexSans-SemiBold.ttf'),
      weight: 600 as const,
      style: 'normal' as const,
    },
    {
      name: 'IBM Plex Sans',
      data: read('PlexSans-Bold.ttf'),
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: 'IBM Plex Mono',
      data: read('PlexMono-SemiBold.ttf'),
      weight: 600 as const,
      style: 'normal' as const,
    },
  ];
}

/** Brand values, repeated here because generated images cannot read the CSS. */
export const ogColors = {
  ink: '#070c20',
  surface: '#0e1529',
  text: '#f4f6fa',
  muted: '#9395a0',
  accent: '#4c618a',
} as const;

export const ogSize = { width: 1200, height: 630 };
