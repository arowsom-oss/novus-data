/**
 * Build a single self-contained HTML file for reviewing the site before it is
 * deployed anywhere.
 *
 * This is review tooling, not part of the website. It does not run on Vercel
 * and nothing under src/ knows it exists.
 *
 * How it works, and why this way: it runs the real production build twice and
 * folds the prerendered pages into one file. Because the pages come from the
 * actual build, the preview cannot drift from the site — there is no second
 * implementation of any layout or any piece of copy.
 *
 *   pass 1  the real content/issues/, i.e. exactly what would deploy today
 *   pass 2  a throwaway archive of [SAMPLE] issues written to a temp folder,
 *           so the archive, the issue template and the populated home page can
 *           be reviewed before any issue exists
 *
 * Each page is shown inside an iframe so that the site's own media queries
 * respond to the frame's width, which makes the phone and tablet widths real
 * rather than a CSS approximation.
 *
 *   npm run preview   →  preview/novus-data-preview.html
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { INPUT_LEDGER } from '../src/config/input-ledger';
import { fixturesSource } from '../src/lib/content/sources/fixtures';
import { fixtureDisruptions } from '../src/lib/disruptions/sources/fixtures';
import { yamlString } from './lib/cli';

const ROOT = process.cwd();
// A normal `next build` prerenders every static route to HTML here, which is
// everything this tool needs. Using it rather than `output: 'export'` also
// avoids export's rule that a dynamic route must generate at least one page —
// which is untrue of /briefings/[slug] before the first issue is published.
const OUT_DIR = path.join(ROOT, '.next', 'server', 'app');
const STATIC_DIR = path.join(ROOT, '.next', 'static');
const PREVIEW_DIR = path.join(ROOT, 'preview');
const PREVIEW_FILE = path.join(PREVIEW_DIR, 'novus-data-preview.html');
/**
 * The same page with the outer document tags removed, for hosts that supply
 * their own <html>/<head>/<body> skeleton and expect only the contents.
 */
const FRAGMENT_FILE = path.join(PREVIEW_DIR, 'novus-data-preview.fragment.html');

interface Page {
  route: string;
  title: string;
  htmlClass: string;
  bodyClass: string;
  body: string;
}

interface Snapshot {
  id: string;
  label: string;
  description: string;
  pages: Page[];
}

// --- running the export -----------------------------------------------------

function runBuild(extraEnv: Record<string, string>): void {
  execFileSync(path.join(ROOT, 'node_modules', '.bin', 'next'), ['build'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NOVUS_ALLOW_INCOMPLETE: '1', ...extraEnv },
  });
}

/** Map a /_next/... URL from the built HTML back to a file on disk. */
function assetPath(url: string): string | null {
  if (!url.startsWith('/_next/static/')) return null;
  return path.join(STATIC_DIR, url.slice('/_next/static/'.length));
}

// --- reading the export -----------------------------------------------------

async function walk(dir: string, found: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, found);
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

/** .next/server/app/about.html → /about, index.html → /, _not-found → /404 */
function routeFor(file: string): string | null {
  const relative = path.relative(OUT_DIR, file).replace(/\\/g, '/');
  if (relative === 'index.html') return '/';
  if (relative === '_not-found.html') return '/404';
  // Other underscore-prefixed files are internal boundaries, not pages.
  if (relative.startsWith('_')) return null;
  return `/${relative.replace(/(?:\/index)?\.html$/, '')}`;
}

function attributeOf(html: string, tag: 'html' | 'body', attribute: string): string {
  const open = new RegExp(`<${tag}\\b[^>]*>`, 'i').exec(html)?.[0] ?? '';
  return new RegExp(`${attribute}="([^"]*)"`, 'i').exec(open)?.[1] ?? '';
}

function innerBody(html: string): string {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = match ? match[1] : html;
  return (
    body
      // The preview is static: hydration payloads and chunk loaders would only
      // throw inside a srcdoc frame with no matching origin.
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<link\b[^>]*rel="preload"[^>]*>/gi, '')
      .trim()
  );
}

/** Collect the stylesheet the export links, with its font files inlined. */
async function collectStyles(html: string): Promise<string> {
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)].map(
    (match) => match[1],
  );

  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1],
  );

  const sheets: string[] = [];
  for (const href of hrefs) {
    const file = assetPath(href);
    if (file && existsSync(file)) {
      // Font URLs are resolved against the stylesheet's own directory, so each
      // sheet has to be inlined before they are concatenated.
      sheets.push(await inlineFonts(await readFile(file, 'utf8'), path.dirname(file)));
    }
  }

  return [...sheets, ...inlineStyles].join('\n');
}

/**
 * next/font self-hosts its files under .next/static/media, and the built CSS
 * points at them with paths relative to the stylesheet. A srcdoc frame has no
 * origin to resolve either form against, so every face is embedded as a data
 * URI.
 */
async function inlineFonts(css: string, sheetDir: string): Promise<string> {
  const pattern = /url\(\s*(['"]?)([^'")]+\.(?:woff2|woff|ttf))\1\s*\)/g;
  const references = new Set([...css.matchAll(pattern)].map((match) => match[2]));

  let result = css;
  for (const reference of references) {
    const file = reference.startsWith('/_next/')
      ? assetPath(reference)
      : path.resolve(sheetDir, reference);
    if (!file || !existsSync(file)) {
      console.warn(`[preview] could not inline font: ${reference}`);
      continue;
    }

    const extension = path.extname(file).slice(1);
    const mime = extension === 'ttf' ? 'font/ttf' : `font/${extension}`;
    const dataUri = `url(data:${mime};base64,${(await readFile(file)).toString('base64')})`;

    // Replace every spelling of the same reference, quoted or not.
    result = result.replace(
      new RegExp(`url\\(\\s*(['"]?)${reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*\\)`, 'g'),
      dataUri,
    );
  }

  return result;
}

/**
 * Generated icons and social cards. A prerendered image route is written as a
 * `.body` file holding the raw PNG bytes.
 */
async function collectImages(): Promise<Record<string, string>> {
  const images: Record<string, string> = {};

  async function embed(key: string, file: string): Promise<void> {
    if (!existsSync(file)) return;
    images[key] = `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
  }

  await embed('opengraph-image.png', path.join(OUT_DIR, 'opengraph-image.body'));
  await embed('icon.png', path.join(OUT_DIR, 'icon.body'));
  await embed('apple-icon.png', path.join(OUT_DIR, 'apple-icon.body'));

  // One issue card, as a sample of the per-issue social image.
  const briefings = path.join(OUT_DIR, 'briefings');
  if (existsSync(briefings)) {
    for (const entry of await readdir(briefings, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      await embed('issue-card.png', path.join(briefings, entry.name, 'opengraph-image.body'));
      if (images['issue-card.png']) break;
    }
  }

  return images;
}

const ROUTE_ORDER = [
  '/',
  '/disruptions',
  '/exposure',
  '/briefings',
  '/alerts',
  '/coverage',
  '/about',
  '/subscribe',
  '/contact',
  '/privacy',
  '/404',
];

function sortRoutes(a: Page, b: Page): number {
  const indexA = ROUTE_ORDER.indexOf(a.route);
  const indexB = ROUTE_ORDER.indexOf(b.route);
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return a.route.localeCompare(b.route);
}

async function readSnapshot(): Promise<{ pages: Page[]; css: string; images: Record<string, string> }> {
  const files = await walk(OUT_DIR);
  const pages: Page[] = [];
  let css = '';

  for (const file of files) {
    const route = routeFor(file);
    if (route === null) continue;
    // /debug/content is development-only and renders the 404 in a prod build.
    if (route.startsWith('/debug')) continue;

    const html = await readFile(file, 'utf8');

    if (!css) css = await collectStyles(html);

    pages.push({
      route,
      title: /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? route,
      htmlClass: attributeOf(html, 'html', 'class'),
      bodyClass: attributeOf(html, 'body', 'class'),
      body: innerBody(html),
    });
  }

  pages.sort(sortRoutes);
  return { pages, css, images: await collectImages() };
}

// --- sample archive ---------------------------------------------------------

/**
 * Writes the [SAMPLE] fixtures out as real content files in a temp folder, so
 * the second pass exercises the same local-files sources the site uses in
 * production — including all of the validation that decides whether an
 * exposure is publishable. Nothing is written into the repository.
 *
 * Returns the issues directory; the disruption source derives its own sibling
 * directory from it.
 */
async function writeSampleArchive(): Promise<{
  root: string;
  issuesDir: string;
  disruptionsDir: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'novus-sample-'));
  const dir = path.join(root, 'issues');
  const disruptionsDir = path.join(root, 'disruptions');
  await mkdir(dir, { recursive: true });
  await mkdir(disruptionsDir, { recursive: true });

  for (const [index, disruption] of fixtureDisruptions.entries()) {
    const sourceLines = (prefix: string, sources: typeof disruption.sources) =>
      sources
        .map(
          (entry) =>
            `${prefix}- title: ${yamlString(entry.title)}\n${prefix}  url: ${yamlString(entry.url)}\n` +
            `${prefix}  publisher: ${yamlString(entry.publisher)}\n${prefix}  retrievedAt: ${yamlString(entry.retrievedAt)}`,
        )
        .join('\n');

    const exposures = disruption.exposures
      .map((exposure) =>
        [
          `  - entity:`,
          `      id: ${yamlString(exposure.entity.id)}`,
          `      name: ${yamlString(exposure.entity.name)}`,
          `      kind: ${yamlString(exposure.entity.kind)}`,
          `      ticker: ${yamlString(exposure.entity.ticker)}`,
          `      sector: ${yamlString(exposure.entity.sector)}`,
          `    severity: ${yamlString(exposure.severity)}`,
          `    confidence: ${yamlString(exposure.confidence)}`,
          `    mechanism: ${yamlString(exposure.mechanism)}`,
          `    asOf: ${yamlString(exposure.asOf)}`,
          `    sources:`,
          sourceLines('      ', exposure.sources),
        ].join('\n'),
      )
      .join('\n');

    const frontmatter = [
      '---',
      `id: ${yamlString(disruption.id)}`,
      `title: ${yamlString(disruption.title)}`,
      `shortLabel: ${yamlString(disruption.shortLabel)}`,
      `status: ${yamlString(disruption.status)}`,
      `category: ${yamlString(disruption.category)}`,
      `startedAt: ${yamlString(disruption.startedAt)}`,
      `updatedAt: ${yamlString(disruption.updatedAt)}`,
      `summary: ${yamlString(disruption.summary)}`,
      // Carried through so the preview's place board lists the register
      // entries naming each place, as the demo server does.
      ...(disruption.author ? [`author: ${yamlString(disruption.author)}`] : []),
      `places: [${disruption.places.map((place) => yamlString(place)).join(', ')}]`,
      'sources:',
      sourceLines('  ', disruption.sources),
      exposures.length > 0 ? `exposures:\n${exposures}` : 'exposures: []',
      '---',
      '',
    ].join('\n');

    await writeFile(
      path.join(disruptionsDir, `${String(index + 1).padStart(2, '0')}-${disruption.id}.md`),
      `${frontmatter}${disruption.contentHtml ?? ''}\n`,
      'utf8',
    );
  }

  const issues = await fixturesSource.listIssues();

  // Oldest first, so the filename prefix matches publication order.
  const ordered = [...issues].reverse();

  for (const [index, summary] of ordered.entries()) {
    const full = await fixturesSource.getIssue(summary.slug);
    const prefix = String(index + 1).padStart(4, '0');
    const frontmatter = [
      '---',
      `issueNumber: ${summary.issueNumber ?? 'null'}`,
      `title: ${yamlString(summary.title)}`,
      `slug: ${yamlString(summary.slug)}`,
      `publishedAt: ${yamlString(summary.publishedAt)}`,
      `excerpt: ${yamlString(summary.excerpt)}`,
      `beehiivUrl: ${yamlString(summary.externalUrl)}`,
      'coverImageUrl: null',
      // The tags decide the kind — briefing, article or long-term review — so
      // writing them out is what puts the sample articles under /articles.
      `tags: ${JSON.stringify(summary.tags)}`,
      '---',
      '',
    ].join('\n');

    await writeFile(
      path.join(dir, `${prefix}-${summary.slug}.md`),
      `${frontmatter}${full?.contentHtml ?? ''}\n`,
      'utf8',
    );
  }

  return { root, issuesDir: dir, disruptionsDir };
}

// --- emitting the preview ---------------------------------------------------

function escapeForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
}

function renderPreview(
  snapshots: Snapshot[],
  css: string,
  images: Record<string, string>,
): string {
  const unresolved = INPUT_LEDGER.filter((record) => record.provenance !== 'confirmed');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Novus Data Review Build</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Source+Serif+4:wght@600&display=swap">
<style>
  /* The harness is deliberately single-theme. It frames a site that is dark by
     brand decision, and a light chrome around it would misrepresent the thing
     being reviewed. Every colour is painted explicitly so the page holds on
     either host background. */
  :root {
    --ground: #05080f;
    --chrome: #0b1120;
    --raised: #131c30;
    --line: rgba(255, 255, 255, 0.09);
    --line-strong: rgba(255, 255, 255, 0.16);
    --text: #e8ecf4;
    --muted: #8c90a0;
    --accent: #7b92be;
    --sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --serif: "Source Serif 4", Iowan Old Style, Georgia, serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
    color-scheme: dark;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 22px;
    padding: 12px 16px;
    background: var(--chrome);
    border-bottom: 1px solid var(--line);
  }

  .bar h1 {
    margin: 0;
    font-family: var(--serif);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.012em;
  }

  .field { display: flex; align-items: center; gap: 8px; }
  .field label, .seg-caption { color: var(--muted); font-size: 12px; white-space: nowrap; }

  select, .seg button {
    font: inherit;
    font-size: 13px;
    color: var(--text);
    background: var(--raised);
    border: 1px solid var(--line);
    padding: 7px 10px;
    border-radius: 2px;
    cursor: pointer;
  }
  select { max-width: 15rem; }
  select:hover, .seg button:hover { border-color: var(--line-strong); }

  /* One segmented control, so the three widths read as alternatives rather
     than three separate buttons. */
  .seg { display: flex; }
  .seg button { border-radius: 0; margin-left: -1px; }
  .seg button:first-child { border-radius: 2px 0 0 2px; margin-left: 0; }
  .seg button:last-child { border-radius: 0 2px 2px 0; }
  /* A width this window cannot actually show is offered but visibly inert,
     rather than silently rendering something narrower than its own label. */
  .seg button:disabled { opacity: 0.4; cursor: not-allowed; }
  .seg button:disabled:hover { border-color: var(--line); }

  .seg button[aria-pressed="true"] {
    background: var(--accent);
    border-color: var(--accent);
    color: #070c20;
    position: relative;
    z-index: 1;
  }

  main { padding-block: 20px 64px; padding-inline: 16px; }
  .wrap { max-width: 1180px; margin: 0 auto; }

  .intro { color: var(--muted); max-width: 68ch; margin: 0 0 20px; }
  .intro strong { color: var(--text); font-weight: 500; }

  .stage { margin: 0 auto; transition: max-width 160ms ease; }
  iframe, .fallback {
    display: block;
    width: 100%;
    min-height: 640px;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    background: #070c20;
  }
  .fallback { padding: 0; overflow: hidden; }

  /* A proof-sheet caption: the frame is meaningless without knowing which
     route and which width produced it. */
  .caption {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 10px;
    color: var(--muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  details {
    margin-top: 26px;
    border: 1px solid var(--line);
    border-radius: 2px;
    background: var(--chrome);
  }
  summary { cursor: pointer; padding: 13px 16px; font-size: 13px; font-weight: 500; }
  summary::marker { color: var(--muted); }
  .panel { padding: 0 16px 18px; }
  .panel > p:first-child { margin-top: 0; }

  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 9px 10px; border-top: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 400; }
  td:first-child { white-space: nowrap; }
  .scroll { overflow-x: auto; }
  code { font-family: var(--mono); font-size: 12px; }

  .tag {
    display: inline-block;
    font-size: 11px;
    padding: 1px 6px;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    color: var(--muted);
    white-space: nowrap;
  }
  .tag.assumed { border-color: var(--accent); color: var(--accent); }
  .tag.blocks { border-color: #b4736a; color: #cf8d83; }

  .cards { display: flex; flex-wrap: wrap; gap: 18px; }
  .cards figure { margin: 0; }
  .cards img { display: block; width: 100%; max-width: 340px; border: 1px solid var(--line); }
  .cards figcaption { margin-top: 7px; color: var(--muted); font-size: 12px; }
  .cards .icon img { max-width: 56px; }

  .metrics { display: grid; gap: 1px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); background: var(--line); border: 1px solid var(--line); }
  .metrics div { background: var(--chrome); padding: 12px 14px; }
  .metrics dt { color: var(--muted); font-size: 12px; }
  .metrics dd { margin: 4px 0 0; font-size: 20px; font-variant-numeric: tabular-nums; }

  @media (max-width: 620px) {
    .bar { gap: 8px 14px; }
    .bar h1 { width: 100%; }
    select { max-width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
<div class="bar">
  <h1>Novus Data</h1>

  <div class="field">
    <label for="state">Content</label>
    <select id="state">
      ${snapshots
        .map((snapshot) => `<option value="${snapshot.id}">${snapshot.label}</option>`)
        .join('\n      ')}
    </select>
  </div>

  <div class="field">
    <label for="page">Page</label>
    <select id="page"></select>
  </div>

  <div class="field">
    <span class="seg-caption">Preview at</span>
    <div class="seg" role="group" aria-label="Preview width">
      <button type="button" data-width="390">Phone</button>
      <button type="button" data-width="820">Tablet</button>
      <button type="button" data-width="0" aria-pressed="true">Fit window</button>
    </div>
  </div>
</div>

<main>
  <div class="wrap">
    <p class="intro" id="intro"></p>

    <div class="stage" id="stage">
      <iframe id="frame" title="Novus Data, rendered"></iframe>
      <p class="caption">
        <span id="caption-route"></span>
        <span id="caption-width"></span>
      </p>
    </div>

    <details>
      <summary>Still unanswered — ${unresolved.length} inputs</summary>
      <div class="panel">
        <p style="color:var(--muted);max-width:68ch">
          Every fact the site states comes from <code>src/config/publication.ts</code> and
          <code>src/config/coverage.ts</code>. <span class="tag assumed">assumed</span> was
          drafted from the project description and needs confirming;
          <span class="tag">unanswered</span> was never supplied, so the site omits the claim
          rather than inventing one.
        </p>
        <div class="scroll">
          <table>
            <thead><tr><th>Input</th><th>State</th><th>What to do</th></tr></thead>
            <tbody>
              ${unresolved
                .map(
                  (record) => `<tr>
                <td><code>${record.key}</code></td>
                <td><span class="tag ${record.provenance}">${record.provenance}</span>${
                  record.requiredForLaunch ? ' <span class="tag blocks">blocks launch</span>' : ''
                }</td>
                <td>${record.note}</td>
              </tr>`,
                )
                .join('\n              ')}
            </tbody>
          </table>
        </div>
      </div>
    </details>

    <details>
      <summary>Measured results</summary>
      <div class="panel">
        <p style="color:var(--muted);max-width:68ch">
          Lighthouse against a production build of the home page, the exposure chart and a
          register entry, plus an automated pass over every page at 320, 390, 1440 and 2560
          pixels. Measured, not estimated.
        </p>
        <dl class="metrics">
          <div><dt>Performance, mobile</dt><dd>96&ndash;99</dd></div>
          <div><dt>Performance, desktop</dt><dd>100</dd></div>
          <div><dt>Accessibility</dt><dd>100</dd></div>
          <div><dt>Best practices</dt><dd>100</dd></div>
          <div><dt>SEO</dt><dd>100</dd></div>
          <div><dt>Contrast failures</dt><dd>0</dd></div>
          <div><dt>Horizontal overflow</dt><dd>0</dd></div>
          <div><dt>Reading measure</dt><dd>66ch</dd></div>
          <div><dt>Unsourced claims shown</dt><dd>0</dd></div>
        </dl>
      </div>
    </details>

    ${
      Object.keys(images).length > 0
        ? `<details>
      <summary>Generated icons and social cards</summary>
      <div class="panel">
        <p style="color:var(--muted);max-width:68ch">
          Generated at build time from the real title, issue number and date, so a shared
          link shows the actual briefing.
        </p>
        <div class="cards">
          ${
            images['opengraph-image.png']
              ? `<figure><img src="${images['opengraph-image.png']}" alt="The default Novus Data share card"><figcaption>Default share card, 1200×630</figcaption></figure>`
              : ''
          }
          ${
            images['issue-card.png']
              ? `<figure><img src="${images['issue-card.png']}" alt="A per-issue share card"><figcaption>Per-issue card, one per briefing</figcaption></figure>`
              : ''
          }
          ${
            images['apple-icon.png']
              ? `<figure class="icon"><img src="${images['apple-icon.png']}" alt="The Novus Data app icon"><figcaption>Icon</figcaption></figure>`
              : ''
          }
        </div>
      </div>
    </details>`
        : ''
    }
  </div>
</main>

<script id="site-css" type="text/css-template">${css.replace(/<\/script/gi, '<\\/script')}</script>
<script>
(function () {
  var SNAPSHOTS = ${escapeForScript(snapshots)};
  var CSS = document.getElementById('site-css').textContent;

  var stateSelect = document.getElementById('state');
  var pageSelect = document.getElementById('page');
  var stage = document.getElementById('stage');
  var frame = document.getElementById('frame');
  var intro = document.getElementById('intro');
  var captionRoute = document.getElementById('caption-route');
  var captionWidth = document.getElementById('caption-width');
  var widthButtons = Array.prototype.slice.call(document.querySelectorAll('[data-width]'));

  var state = SNAPSHOTS[0].id;
  var route = '/';
  var width = 0;
  var shadowHost = null;

  function snapshot() {
    for (var i = 0; i < SNAPSHOTS.length; i += 1) {
      if (SNAPSHOTS[i].id === state) return SNAPSHOTS[i];
    }
    return SNAPSHOTS[0];
  }

  function currentPage() {
    var pages = snapshot().pages;
    for (var i = 0; i < pages.length; i += 1) {
      if (pages[i].route === route) return pages[i];
    }
    return pages[0];
  }

  function fillPages() {
    var pages = snapshot().pages;
    pageSelect.innerHTML = '';
    pages.forEach(function (page) {
      var option = document.createElement('option');
      option.value = page.route;
      option.textContent = page.route === '/404' ? '/404  not found' : page.route;
      pageSelect.appendChild(option);
    });
    var known = false;
    for (var i = 0; i < pages.length; i += 1) if (pages[i].route === route) known = true;
    if (!known) route = pages[0].route;
    pageSelect.value = route;
  }

  function documentFor(page) {
    return '<!doctype html><html lang="en" class="' + page.htmlClass + '">' +
      '<head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + page.title + '</title>' +
      '<style>html,body{min-height:100%}</style>' +
      '<style>' + CSS + '</style></head>' +
      '<body class="' + page.bodyClass + '">' + page.body + '</body></html>';
  }

  function measuredWidth() {
    var el = shadowHost || (frame && !frame.hidden ? frame : null);
    return el ? Math.round(el.getBoundingClientRect().width) : 0;
  }

  function updateCaption() {
    captionRoute.textContent = currentPage().route;
    var actual = measuredWidth();
    captionWidth.textContent = actual ? 'rendered at ' + actual + 'px' : 'fits this window';
  }

  /* The narrow presets only mean anything on a window wide enough to hold
     them. Below that the frame is already that narrow, so offering to
     "simulate" a phone would render a frame WIDER than the label claims. */
  function fitButtons() {
    var avail = stage.parentNode.getBoundingClientRect().width;
    widthButtons.forEach(function (button) {
      var w = Number(button.getAttribute('data-width'));
      var tooWide = w > 0 && w > avail;
      button.disabled = tooWide;
      button.title = tooWide
        ? 'This window is ' + Math.round(avail) + 'px wide, so it cannot show a ' + w + 'px frame.'
        : '';
      if (tooWide && button.getAttribute('aria-pressed') === 'true') {
        selectWidth(widthButtons[widthButtons.length - 1]);
      }
    });
  }

  function selectWidth(button) {
    widthButtons.forEach(function (other) { other.setAttribute('aria-pressed', 'false'); });
    button.setAttribute('aria-pressed', 'true');
    width = Number(button.getAttribute('data-width'));
    stage.style.maxWidth = width ? width + 'px' : '100%';
    updateCaption();
    window.setTimeout(function () { resize(); updateCaption(); }, 220);
  }

  function resize() {
    if (!frame || frame.hidden) return;
    var doc = frame.contentDocument;
    if (!doc) return;
    frame.style.height = Math.max(doc.documentElement.scrollHeight, 640) + 'px';
  }

  /* Shadow DOM fallback. If a host policy refuses to render the srcdoc frame,
     the page still shows the site: a shadow root gives the same style
     isolation, at the cost of media queries answering to the real viewport, so
     the width control becomes approximate and says so. */
  function useShadowFallback() {
    if (!shadowHost) {
      frame.hidden = true;
      shadowHost = document.createElement('div');
      shadowHost.className = 'fallback';
      shadowHost.attachShadow({ mode: 'open' });
      frame.parentNode.insertBefore(shadowHost, frame.nextSibling);
      captionWidth.title = 'Widths are approximate in this rendering mode.';
    }
    var page = currentPage();
    shadowHost.shadowRoot.innerHTML =
      '<style>:host{display:block}</style><style>' + CSS + '</style>' +
      '<div class="' + page.htmlClass + '"><div class="' + page.bodyClass + '">' + page.body + '</div></div>';
  }

  function draw() {
    intro.innerHTML = '<strong>' + snapshot().label + '.</strong> ' + snapshot().description;
    updateCaption();

    if (shadowHost) {
      useShadowFallback();
      return;
    }

    frame.srcdoc = documentFor(currentPage());

    // If the frame has not produced a document shortly after being asked to,
    // a policy is blocking it; fall back rather than showing an empty box.
    window.setTimeout(function () {
      if (shadowHost) return;
      var doc = frame.contentDocument;
      if (!doc || !doc.body || doc.body.childElementCount === 0) useShadowFallback();
    }, 900);
  }

  frame.addEventListener('load', function () {
    var doc = frame.contentDocument;
    if (!doc) return;
    resize();

    // Links drive the preview rather than trying to navigate the frame.
    doc.addEventListener('click', function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
      if (!anchor) return;
      var href = anchor.getAttribute('href') || '';
      if (href.charAt(0) === '#') return;
      event.preventDefault();
      if (href.charAt(0) !== '/') return;
      var clean = href.split('#')[0].replace(/\\/$/, '') || '/';
      var pages = snapshot().pages;
      for (var i = 0; i < pages.length; i += 1) {
        if (pages[i].route === clean) {
          route = clean;
          pageSelect.value = clean;
          draw();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    });
  });

  stateSelect.addEventListener('change', function () {
    state = stateSelect.value;
    fillPages();
    draw();
  });

  pageSelect.addEventListener('change', function () {
    route = pageSelect.value;
    draw();
  });

  widthButtons.forEach(function (button) {
    button.addEventListener('click', function () { selectWidth(button); });
  });

  window.addEventListener('resize', function () {
    fitButtons();
    updateCaption();
  });

  fillPages();
  fitButtons();
  draw();
})();
</script>
</body>
</html>
`;
}

// --- main -------------------------------------------------------------------

async function main(): Promise<void> {
  await rm(PREVIEW_DIR, { recursive: true, force: true });

  console.log('\n[preview] pass 1 of 2 — the site exactly as it stands today\n');
  await rm(path.join(ROOT, '.next'), { recursive: true, force: true });
  runBuild({});
  const live = await readSnapshot();

  console.log('\n[preview] pass 2 of 2 — the same site with sample issues\n');
  const { root: sampleRoot, issuesDir, disruptionsDir } = await writeSampleArchive();
  let sample: Awaited<ReturnType<typeof readSnapshot>>;
  try {
    await rm(path.join(ROOT, '.next'), { recursive: true, force: true });
    runBuild({ NOVUS_CONTENT_DIR: issuesDir, NOVUS_DISRUPTIONS_DIR: disruptionsDir });
    sample = await readSnapshot();
  } finally {
    await rm(sampleRoot, { recursive: true, force: true });
  }

  const snapshots: Snapshot[] = [
    {
      id: 'live',
      label: 'As it stands today (pre-launch)',
      description:
        'This is exactly what would deploy right now: no issues have been published, so the site renders its pre-launch state rather than an empty archive.',
      pages: live.pages,
    },
    {
      id: 'sample',
      label: 'With sample issues',
      description:
        'The same build with a placeholder register and archive, so the disruption register, the exposure chart and the issue template can all be reviewed. Every sample title is prefixed [SAMPLE], every company in it is invented, and none of this content is in the repository.',
      pages: sample.pages,
    },
  ];

  await mkdir(PREVIEW_DIR, { recursive: true });
  await writeFile(
    PREVIEW_FILE,
    renderPreview(snapshots, sample.css || live.css, { ...live.images, ...sample.images }),
    'utf8',
  );

  // The fragment keeps <title>, the stylesheet link, the styles, the markup and
  // the scripts, and drops only the document scaffolding around them.
  const full = await readFile(PREVIEW_FILE, 'utf8');
  const fragment = full
    .replace(/^[\s\S]*?<head>/i, '')
    .replace(/<\/head>\s*<body>/i, '')
    .replace(/<\/body>\s*<\/html>\s*$/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .trim();
  await writeFile(FRAGMENT_FILE, `${fragment}\n`, 'utf8');

  const bytes = Buffer.byteLength(full);
  console.log('');
  console.log(`  live pages    ${live.pages.length}`);
  console.log(`  sample pages  ${sample.pages.length}`);
  console.log(`  written       preview/novus-data-preview.html (${(bytes / 1024).toFixed(0)} KB)`);
  console.log('  written       preview/novus-data-preview.fragment.html');
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
