import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'novus-content-regressions-'));
  const issues = path.join(root, 'issues');
  const disruptions = path.join(root, 'disruptions');
  await mkdir(issues);
  await mkdir(disruptions);
  process.env.NOVUS_CONTENT_DIR = issues;
  process.env.NOVUS_DISRUPTIONS_DIR = disruptions;
  Object.assign(process.env, { NODE_ENV: 'development' });

  for (const [slug, date] of [
    ['offset-east', '2026-10-02T00:30:00+02:00'],
    ['offset-west', '2026-10-02T23:30:00-04:00'],
    ['impossible-day', '2026-02-30T00:30:00+02:00'],
    ['valid-leap-day', '2024-02-29'],
  ]) {
    await writeFile(path.join(issues, `${slug}.md`), `---\nslug: "${slug}"\ntitle: "[SAMPLE] ${slug}"\npublishedAt: "${date}"\n---\n<p>[SAMPLE] isolated date test.</p>`);
  }
  const content = await import('@/lib/content/sources/local-files');
  const rows = await content.localFilesSource.listIssues();
  assert.equal(rows.find(r => r.slug === 'offset-east')?.publishedAt, '2026-10-01T22:30:00.000Z');
  assert.equal(rows.find(r => r.slug === 'offset-west')?.publishedAt, '2026-10-03T03:30:00.000Z');
  assert.equal(rows.find(r => r.slug === 'impossible-day')?.publishedAt, '');
  assert.equal(rows.find(r => r.slug === 'valid-leap-day')?.publishedAt, '2024-02-29T00:00:00.000Z');
  console.log('PASS valid offsets retained and impossible calendar dates refused');

  const { isHttpUrl } = await import('@/lib/url');
  for (const url of ['https://', 'https://[bad', 'https://example.invalid:99999', 'javascript:alert(1)', 'https://example.invalid/a b']) assert.equal(isHttpUrl(url), false, url);
  for (const url of ['https://example.invalid/report', 'HTTP://example.invalid/report', 'https://[::1]/']) assert.equal(isHttpUrl(url), true, url);
  console.log('PASS shared citation URL validator');

  for (const [id, url] of [['invalid-citation', 'https://[bad'], ['valid-citation', 'https://example.invalid/report']]) {
    await writeFile(path.join(disruptions, `${id}.md`), `---\nid: "${id}"\ntitle: "[SAMPLE] ${id}"\nshortLabel: "SMP"\nstatus: "watch"\ncategory: "chokepoint"\nupdatedAt: "2026-10-02"\nsummary: "[SAMPLE] Isolated citation test."\nsources:\n  - title: "[SAMPLE] Test report"\n    url: "${url}"\n    publisher: "[SAMPLE] Example publisher"\n    retrievedAt: "2026-10-02"\nexposures: []\n---\n`);
  }
  const register = await import('@/lib/disruptions/sources/local-files');
  const entries = await register.readDisruptions();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, 'valid-citation');
  assert.match((await register.readDisruptionDiagnostics()).warnings.join('\n'), /valid absolute http\(s\) URL/);
  console.log('PASS register refuses an entry with only malformed citations');

  const image = await import('@/app/articles/[slug]/opengraph-image');
  assert.deepEqual(await image.generateStaticParams(), []);
  const response = await image.default({ params: Promise.resolve({ slug: 'offset-east' }) });
  assert.equal(response.status, 404);
  console.log('PASS hidden article social cards return 404');
  console.log(`4 content regression groups passed; isolated files: ${root}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });

