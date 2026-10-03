import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const cli = path.join(repo, 'node_modules/tsx/dist/cli.mjs');
const config = path.join(repo, 'tsconfig.json');
let feed = '';
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/rss+xml');
  res.end(feed);
});
const rss = (...items) => `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>[SAMPLE] isolated validation</title>${items.join('')}</channel></rss>`;
const item = (slug, body = '<p>[SAMPLE] Full issue text.</p>', guid = slug, tag = '') => `<item><title>[SAMPLE] ${slug}</title><link>https://example.invalid/p/${slug}</link><guid>${guid}</guid><pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate><description>Only a short summary</description>${tag ? `<category>${tag}</category>` : ''}${body === null ? '' : `<content:encoded><![CDATA[${body}]]></content:encoded>`}</item>`;
async function run(cwd, script, args = [], extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.BEEHIIV_RSS_URL;
  delete env.NOVUS_DISRUPTIONS_DIR;
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--tsconfig', config, script, ...args], { cwd, env, windowsHide: true });
    let out = '';
    child.stdout.on('data', b => { out += b; });
    child.stderr.on('data', b => { out += b; });
    child.on('error', reject);
    child.on('exit', code => resolve({ code, out }));
  });
}
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'novus-rss-regressions-'));
  const url = `http://127.0.0.1:${server.address().port}/feed.xml`;
  const cwd = path.join(root, 'sync');
  await fs.mkdir(cwd);
  await fs.writeFile(path.join(cwd, '.env.local'), `BEEHIIV_RSS_URL=${url}\n`);
  const script = path.join(repo, 'scripts/sync-issues.ts');
  const files = async () => { try { return await fs.readdir(path.join(cwd, 'content/issues')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } };
  feed = rss(item('full-text', '<p>[SAMPLE] Complete issue.</p><script>bad()</script>', 'full-text-guid', 'Article'));
  let result = await run(cwd, script, ['--dry-run']);
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /would write.*Article/);
  assert.deepEqual(await files(), []);
  passed('.env.local and encoded body dry run');

  result = await run(cwd, script);
  assert.equal(result.code, 0, result.out);
  const names = await files();
  assert.equal(names.length, 1);
  const issueFile = path.join(cwd, 'content/issues', names[0]);
  const original = await fs.readFile(issueFile, 'utf8');
  assert.match(original, /Complete issue/);
  assert.doesNotMatch(original, /bad\(\)/);
  assert.match(original, /beehiivGuid: "full-text-guid"/);
  passed('full text saved with stable identity and sanitisation');

  feed = rss(item('new-valid'), item('new-missing', null));
  for (const args of [['--dry-run'], []]) {
    result = await run(cwd, script, args);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /has no content:encoded body/);
    assert.deepEqual(await files(), names);
    assert.equal(await fs.readFile(issueFile, 'utf8'), original);
  }
  passed('mixed full/summary feed aborts without partial writes');

  feed = rss(item('full-text', null, 'full-text-guid'));
  result = await run(cwd, script, ['--force', 'full-text']);
  assert.equal(result.code, 1, result.out);
  assert.equal(await fs.readFile(issueFile, 'utf8'), original);
  passed('forced missing body preserves archived bytes');

  feed = rss(item('full-text', '<p> </p>', 'full-text-guid'));
  result = await run(cwd, script, ['--force', 'full-text']);
  assert.equal(result.code, 1, result.out);
  assert.equal(await fs.readFile(issueFile, 'utf8'), original);
  passed('empty markup is rejected');

  feed = rss(item('new-other'));
  result = await run(cwd, script, ['--force', 'unknown']);
  assert.equal(result.code, 1, result.out);
  assert.deepEqual(await files(), names);
  result = await run(cwd, script, ['--force=']);
  assert.equal(result.code, 1, result.out);
  passed('unknown or empty force writes nothing');

  feed = rss(item('full-text', '<p>[SAMPLE] Updated full text.</p>', 'full-text-guid'), item('new-unrelated'));
  result = await run(cwd, script, ['--force', 'full-text']);
  assert.equal(result.code, 0, result.out);
  assert.deepEqual(await files(), names);
  assert.match(await fs.readFile(issueFile, 'utf8'), /Updated full text/);
  passed('force updates exactly one issue');

  feed = rss(item('same-slug', '<p>one</p>', 'one'), item('same-slug', '<p>two</p>', 'two'));
  result = await run(cwd, script);
  assert.equal(result.code, 1, result.out);
  assert.deepEqual(await files(), names);
  passed('source collision refused');

  feed = rss(item('duplicate'), item('duplicate'));
  result = await run(cwd, script);
  assert.equal(result.code, 1, result.out);
  assert.deepEqual(await files(), names);
  passed('duplicate feed identity refused');

  const renamed = (await fs.readFile(issueFile, 'utf8')).replace('slug: "full-text"', 'slug: "permanent-local-url"');
  await fs.writeFile(issueFile, renamed);
  feed = rss(item('source-renamed', '<p>[SAMPLE] Another update.</p>', 'full-text-guid'));
  result = await run(cwd, script, ['--force', 'permanent-local-url']);
  assert.equal(result.code, 0, result.out);
  const preserved = await fs.readFile(issueFile, 'utf8');
  assert.match(preserved, /slug: "permanent-local-url"/);
  assert.match(preserved, /Another update/);
  assert.deepEqual(await files(), names);
  passed('frontmatter slug and archived filename stay permanent');

  const scaffold = path.join(root, 'scaffold');
  const register = path.join(root, 'isolated-register');
  await fs.mkdir(scaffold);
  await fs.writeFile(path.join(scaffold, '.env.local'), `NOVUS_DISRUPTIONS_DIR=${register}\n`);
  result = await run(scaffold, path.join(repo, 'scripts/new-disruption.ts'), ['--template']);
  assert.equal(result.code, 0, result.out);
  assert.equal((await fs.readdir(register)).length, 1);
  await assert.rejects(fs.stat(path.join(scaffold, 'content/disruptions')), { code: 'ENOENT' });
  passed('scaffolder follows .env.local register override');

  console.log(`${checks} regression cases passed; isolated files: ${root}`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());

