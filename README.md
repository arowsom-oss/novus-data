# Novus Data

**Novus Data** is an information and financial-news site about supply chain
disruption: a dated, sourced register of what is going wrong in physical trade,
a chart mapping each problem to the companies it reaches, and an email briefing
summarising both.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4.
Statically generated, deployed on Vercel.

Both the register and the issue archive live **in this repository** as files.
Issues are written and emailed in Beehiiv and synced here afterwards; the site
never contacts Beehiiv at build time or at request time.

| Section | What it is |
|---|---|
| `/disruptions` | The register — what is going wrong, dated and sourced |
| `/exposure` | The chart — which companies and sectors each problem reaches |
| `/briefings` | The email briefing archive |
| `/alerts` | The planned notifications app. It does not exist yet |

---

## Getting started

```bash
nvm use                 # Node 22 (minimum 20)
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev              # http://localhost:3000
```

**New to the project?** `CONTRIBUTING.md` opens with a twenty-minute joining
path — what to run, what to read, and how to add yourself to the masthead.

## Commands

**Start with `npm run doctor`.** It reports where the project stands and the one
thing to do next, and it reads the same ledger the production build refuses on,
so it cannot contradict the build.

| Command | What it does |
|---|---|
| `npm run doctor` | Where the project stands and the next action. `-- --next` for one line |
| `npm run new-disruption` | Interactive scaffolder for a register entry. Validates every field against what the loader enforces, so nothing is silently dropped |
| `npm run review` | The weekly register review as a worklist, soonest-to-go-stale first. `-- --due` for only what is due |
| `npm run check` | `typecheck` + `lint` + `doctor`. Run before committing |
| `npm run dev` | Development server |
| `npm run dev:demo` | Development server against the sample archive and register — 16 placeholder issues and 6 placeholder disruptions, so every page has something on it |
| `npm run build` | Production build. **Fails if a launch-critical input is still missing** — see below |
| `npm run start` | Serve a production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run sync-issues` | Pull new issues from the Beehiiv feed into `content/issues/` |
| `npm run preview` | Build a single-file review preview at `preview/novus-data-preview.html` |

New to the codebase, or back after a while? **`START-HERE.md`** is a task index:
"I want to change X" → the file to open.

## Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is git-ignored and must never
be committed.

| Key | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, no trailing slash | No — falls back to `$VERCEL_URL`, then `localhost` |
| `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL` | Where the subscribe buttons point | **Yes, before launch** |
| `NEXT_PUBLIC_BEEHIIV_HOME_URL` | Footer link to the Beehiiv publication | No |
| `NEXT_PUBLIC_BEEHIIV_FEED_URL` | Footer RSS link for readers | No |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public contact address | **Yes, before launch** |
| `CONTENT_SOURCE` | `local` (default) or `fixtures` (development only) | No |
| `BEEHIIV_RSS_URL` | The feed the sync script reads | Only to run the sync. **Not needed on Vercel** |

### Why a build can fail on purpose

`src/config/input-ledger.ts` refuses to produce a production build while a
launch-critical fact is still missing. The editor's name is confirmed; the
subscribe URL and contact address remain unset in this checkout. The error
names exactly what is missing and where to put it.

This is deliberate. An about page with no author, or a subscribe button that
goes nowhere, defeats the point of the site, and a loud build failure is a much
better outcome than shipping one. To build anyway for review purposes, set
`NOVUS_ALLOW_INCOMPLETE=1`. Never set it on Vercel.

---

## Adding a disruption to the register

Create `content/disruptions/NN-your-id.md`. The full frontmatter format is in
`CLAUDE.md` §6a. The short version of what the site will refuse:

- A disruption with **no source** is skipped entirely.
- An exposure with no **mechanism**, no **confidence**, no **`asOf`** date or no
  **source** is dropped — the rest of the entry still publishes.
- Two entries with the same `id`, or two exposures naming the same entity on one
  disruption, are refused.

Every refusal prints a warning naming the file, both in the build log and on
`/debug/content`. Run `npm run dev` and open `/debug/content` after editing: the
warnings there are the list of claims the site would not stand behind.

This is deliberate. The chart tells a reader that a named problem reaches a named
company, and someone may act on that.

## Publishing an issue

This is the only recurring manual step in the project.

```
1. Write and send the issue in Beehiiv, as normal.
2. npm run sync-issues
3. Review the new file in content/issues/ — check the HTML converted cleanly.
4. git add content/issues/ && git commit -m "content: add issue N"
5. git push   (Vercel deploys automatically)
```

Everything else updates itself: the home page hero, the archive, previous/next
navigation, the sitemap and the social cards.

**Sync promptly after each send.** The Beehiiv feed carries only a window of
recent items — commonly about twenty. An issue that falls out of that window
before it is synced cannot be recovered by the script and would have to be
written by hand.

### Sync options

```bash
npm run sync-issues                   # fetch and write anything new
npm run sync-issues -- --dry-run      # report what would be written, write nothing
npm run sync-issues -- --force slug   # deliberately re-pull and overwrite one issue
```

Existing files are never overwritten without `--force`, because a local file may
carry a hand-edited correction that is the better copy.

---

## How to change common things

| To change… | Edit | Notes |
|---|---|---|
| Any fact about the publication or author | `src/config/publication.ts` | Name, description, readers, cadence, methodology, newsletter and alerts naming, disclaimer. Nothing factual is written inline in a page |
| A disruption or an exposure | The file in `content/disruptions/` | See above. Check `/debug/content` afterwards |
| The severity colours or the chart's rules | `src/app/globals.css` and `src/components/exposure-chart.tsx` | Read `CLAUDE.md` §6a first — the ramp is validated, not chosen by eye |
| The topics tracked | `src/config/coverage.ts` | The home page and `/coverage` both read this. Add, cut or reorder freely |
| Navigation, header or footer links | `src/config/nav.ts` | The sitemap derives from this too |
| Colours, type scale, spacing tokens | `src/app/globals.css` (`@theme`) | Tailwind 4 — there is no `tailwind.config.ts` |
| Page copy | The page file in `src/app/<route>/page.tsx` | Prose lives with its layout; facts do not |
| A typo in a published issue | The file in `content/issues/` | A normal edit and commit. Do not re-sync |
| Add a route | New folder in `src/app/`, then add it to `src/config/nav.ts` | The sitemap picks it up automatically |
| Subscribe destination | `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL` | Environment, not code |

### Things to leave alone

- **A slug in `content/issues/` is a permanent URL.** If one truly must change,
  add a redirect in `next.config.ts` rather than silently breaking the old link.
- **`--accent` (`#4C618A`) is structural only.** It fails WCAG AA for text on the
  navy background. Use `--accent-text` (`#7B92BE`) for anything read or clicked.
- **The `.prose-novus` rules in `globals.css` are deliberately unlayered.** Moving
  them into `@layer components` makes issue bodies lose to the typography
  plugin's defaults and render nearly invisibly.

---

## Project layout

```
content/issues/          The archive. One markdown file per issue
scripts/sync-issues.ts   Pulls issues from Beehiiv RSS. The only Beehiiv code
scripts/build-preview.ts Builds the single-file review preview
src/config/              Facts, topics and navigation
src/lib/content/         The typed content layer pages read from
src/app/                 Routes, metadata, icons, error boundaries
src/components/          Presentational components
```

Pages import from `@/lib/content` and never from a source implementation, so the
publication can move off Beehiiv without touching a page. ESLint enforces that
boundary.

## Further reading

- `CLAUDE.md` — architecture, rules and working notes
- `DEPLOY.md` — first deployment and the domain cutover
- `HANDOFF.md` — open questions, judgement calls and deferred work
