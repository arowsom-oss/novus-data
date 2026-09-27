# CLAUDE.md — Novus Data website

Working notes for anyone (human or agent) picking this repository up. Read this
before changing anything.

## 1. What this project is

**Novus Data is an information and financial-news site about supply chain
disruption.** It does five things, in this order of importance:

1. **The register** (`/disruptions`) — what is going wrong in physical trade
   right now, each entry dated, sourced and given a status.
2. **The exposure chart** (`/exposure`) — which companies and sectors each
   problem reaches, and by what mechanism.
3. **The monitor** (`/monitor`) — what is changing, re-read every fifteen
   minutes: where news reporting of strikes, blockades, sanctions and fighting
   is running above its own normal, rule-based flags, a board of every tracked
   place, ships at chokepoints, hazards, port wind and energy prices. Raw
   readings, not assessments; see §6d.
4. **Articles** (`/articles`) — long-term reviews and articles written for
   the site, published from Beehiiv like the briefing (§6).
5. **The briefing** (`/briefings`) — an email newsletter summarising movement in
   the first two. **It is one part of the site, not the whole of it.** An
   earlier version of this repository was built as an information page for the
   newsletter; that framing is wrong and has been replaced.

A notifications app (`Novus Data Alerts`) is planned and does not exist. The
`/alerts` page says so in its first sentence. See §14.2 for the seam.

Beehiiv is where issues are written and emailed. This repository is where both
the register and the issue archive live.

## 2. The two standing constraints

These are quoted verbatim from the build brief and shape every decision.

> **The reader may be evaluating the author, not just the content.** A realistic
> visitor is a finance professional forming a judgement about whether this person
> is serious. Apply this test to every line of copy and every design choice:
> *would this embarrass the author if a managing director opened it?* Overstatement,
> hype vocabulary, and unsupported claims fail badly. Understatement passes.

> **Publishing beats polish.** The publication's value comes from issues shipping
> on schedule. The site must create near-zero recurring maintenance burden. If a
> design requires hand-editing a file per issue beyond the single documented sync
> step, the design is wrong — change it.

### Working style

Carried over from the project's first repository (1 September 2026), which
held only setup files and has since been retired. Still how every session
should work:

- The author is learning web development. Explain non-obvious decisions in one
  or two lines.
- Small, reviewable diffs. One concern per commit.
- Conventional commit messages (`fix:`, `feat:`, `docs:`, `refactor:` …).
- When something has a real trade-off, say so and give a recommendation.
- If a requirement in a prompt is ambiguous, ask instead of assuming.
- Type checks and the production build must pass before a task is called done.

## 3. Stack and versions

| Thing | Version | Notes |
|---|---|---|
| Next.js | **16.3.4** | App Router. `create-next-app` pinned 16.3.5, which the registry does not serve; corrected to the published latest. |
| React | **19.2.8** | |
| Tailwind CSS | **4.3.3** | **v4 convention: design tokens live in `@theme` inside `src/app/globals.css`. There is no `tailwind.config.ts` and none should be added.** |
| TypeScript | 5.9.3 | strict |
| Node | 22 (`.nvmrc`) | minimum 20 |

Route props use Next 16's generated globals: `PageProps<'/briefings/[slug]'>`
and `LayoutProps<'/'>`. `params` is a **Promise** and must be awaited.

### A second trap: `input-ledger.ts` must not reach the browser

It asserts at module load. If a client component ever imports it — directly, or
by importing something that imports it — the assertion runs during hydration,
throws, and drops every page into the global error boundary. This already
happened once, when the wordmark moved into the navigation client component and
dragged the guard along with it.

`publication.ts` is deliberately free of side effects so that client components
can read the facts. Keep it that way, and keep `input-ledger.ts` imported only by
the root layout and `/debug/content`.

### A Tailwind 4 trap that already bit once

`@tailwindcss/typography` registers `.prose` in Tailwind's **utilities** layer.
Anything in `@layer components` loses to it in the cascade. The `.prose-novus`
overrides in `globals.css` are therefore **deliberately unlayered** — if they are
moved back inside `@layer components`, issue bodies silently render in the
plugin's default gray-700 on navy, which is close to invisible. Do not "tidy"
them into a layer.

## 4. Non-negotiable rules

### Rule 1 — No fabricated data, metrics, or social proof

Never generate, and never leave in the codebase: subscriber or reader counts,
open rates, growth figures, "trusted by" / "as featured in" logos, testimonials
or endorsements (including anonymised ones), named readers or institutions,
indicator values, freight rates, transit counts or anything presented as market
data, animated counters, stat blocks, "X data sources monitored" claims, or fake
issue titles anywhere that could reach production.

If a layout wants a number, use a real one or change the layout. **Empty is
better than invented.**

**Amended by the author: live readings.** The author asked for live, close to
real-time data, so `/monitor` and `/live.json` now state figures — vessel
counts, reporting against normal, magnitudes, wind speeds, energy prices, and
(only behind a licensed key) share prices. They are the second
sanctioned place figures appear, and they are held to a rule enforced in code
(§6d), not in editorial habit: every figure comes from a named public source
with a followable link, carries the time **that source** produced it, and is
marked delayed or stale against the source's own cadence. A feed that fails
renders as *unavailable* with a reason — never a placeholder, never a last
known value presented as current, never a zero. The prohibition on
*fabricated* figures is unchanged and applies with full force here: a live
panel with no data says so.

**This rule got stronger, not weaker, when the site became a data product.** The
register and the exposure chart do publish claims about named companies — but
only claims that carry a mechanism, a confidence level, a date and a followable
source, enforced in code (§6a). Sourced is not the same as invented. Nothing
else on the site may state a figure at all, except the live readings described
in the amendment above and in §6d.

Two fenced exceptions, both `[SAMPLE]`-prefixed, both unreachable without
`CONTENT_SOURCE=fixtures`, and both throwing at module load if a production
build touches them:

- `src/lib/content/sources/fixtures.ts` — placeholder issues. **Sixteen of
  them, deliberately awkward rather than tidy**, because most of the archive's
  behaviour only appears above a threshold: `/briefings` groups by year only
  above `GROUP_ARCHIVE_ABOVE` (12), so with three fixtures that layout was
  unreachable. The set keeps a null `issueNumber`, an unparseable
  `publishedAt`, a title that wraps twice, an issue with no excerpt and one
  with no body. Keep at least one of each if you edit it — they are what make
  the layer's rules visible instead of theoretical. `npm run dev:demo` runs
  against them.
- `src/lib/disruptions/sources/fixtures.ts` — placeholder register entries.
  **Every company in it is invented.** Attaching a made-up exposure to a real
  listed company would read as a sourced claim about a real business, which is
  exactly the harm §6a exists to prevent. Keep the names fictional.
- `src/lib/live/sources/fixtures.ts` — placeholder live readings, shaped like
  each publisher's raw response and run through the **real** parsers, so the
  demo exercises the same code production does. Titles are `[SAMPLE]`, URLs
  are `example.invalid`, vessel MMSIs start `999`. Timestamps are relative to
  now and deliberately spread so every state renders: a delayed feed, a stale
  one, a rate-limited theme, an empty storm list, a port at gale force. The
  page also shows a `[SAMPLE] data` banner whenever this source is active.

### Rule 2 — No implied organisation

**Amended by the author.** The site now uses a company voice — "we", "us", "what
we do at Novus Data" — on the marketing sections of the home page and in the
mission statement. That is a normal way for a company to speak about itself and
it is not a lie.

What the amendment does **not** license, and what stays forbidden: "our team",
"our analysts", "our research desk", a claimed office, a headcount, a founding
year that has not happened, or any phrasing that implies staff or an institution
that does not exist. "We" as the voice of the company is fine; "we" as a crowd of
people is not.

Editorial pages — `/about`, register entries, briefings — carry the byline, so
they speak as the people who wrote them: first-person singular with one author,
and naming who recorded what once there is more than one. **Two real, named
people is not an implied organisation** — the amendment's limit is inventing
staff, not having them.

`publication.authors` is the masthead and the first entry is the editor: the
byline of record, the name the build refuses to run without, and the fallback
on any register entry that names nobody. `src/config/publication.ts` exports
`editor()`, `namedAuthors()`, `hasCoAuthors()`, `authorById()` and
`formatAuthorNames()` so every surface answers "who wrote this" identically.
An author entry whose `name` is null is a placeholder, never rendered as a
person.

### Rule 3 — No third-party assets

No Unsplash, Picsum, placeholder.com or any external image service. No stock
photography. No copyrighted logos, marks or fonts outside Google Fonts. Visual
interest comes from typography, layout, spacing, and CSS/SVG written here. Icons
are inline SVG.

### Rule 4 — Ask before installing

Only the dependencies listed in section 7 may be installed without asking.

### Rule 5 — Never commit secrets

`.env.local` is git-ignored. `.env.example` is committed with keys and empty
values only.

### Rule 6 — One manual step per issue, and only one

Publishing an issue takes exactly one human action beyond writing it: run
`npm run sync-issues`, review, commit, push. Nothing else may require a
hand-edit — not titles, dates, counts, ordering, sitemap entries, navigation or
social cards. If you catch yourself writing a hardcoded issue reference or a
hardcoded year, derive it instead.

### Rule 7 — Do not touch external accounts

Do not log into or configure Beehiiv, GitHub, Vercel or any DNS provider. Where a
step needs account access, write instructions in `DEPLOY.md` instead.

## 5. Directory map

```
CONTRIBUTING.md            How two people work on this without breaking the standard.
content/issues/            The issue archive of record. One .md per issue.
content/disruptions/       The disruption register. One .md per problem.
scripts/sync-issues.ts     Pulls new issues from Beehiiv RSS. The ONLY Beehiiv code.
scripts/build-preview.ts   Review tooling. Folds the built site into one HTML file.
scripts/doctor.ts          State of the project + the next action. Reads INPUT_LEDGER.
scripts/new-disruption.ts  Register scaffolder. Mirrors the loader's validation.
scripts/review-register.ts The review worklist, by how close each entry is to stale.
scripts/live-check.ts      Reads every live feed once, for real. Run where the network is open.
scripts/lib/cli.ts         Shared colour, prompting and .env.local reading.
src/config/                Every fact the site states, and the navigation.
  publication.ts             The facts. Pure data, no side effects, safe anywhere.
  input-ledger.ts            Where each fact came from + the launch guard. SERVER ONLY.
  coverage.ts                The tracked topics. Home and /coverage both read it.
  nav.ts                     Header, footer and sitemap routes.
src/lib/content/           The issue content layer. See section 6.
src/lib/disruptions/       The register and exposure layer. See section 6a.
src/lib/accounts/          The account contract and its Supabase store. See 6b.
src/lib/live/              The live layer: nine feeds, one adapter each. See 6d.
  types.ts, meta.ts,         Pure — safe in client components. Components import
  clocks.ts, nodes.ts,       labels from these, never from the layer index.
  display.ts, countries.ts   clocks.ts holds each source's freshness windows.
  derive.ts                  Flags and the place board, derived from a snapshot. Pure.
  sources/                   The adapters. SERVER ONLY; the index reads the keys.
src/lib/monitor.ts         What /monitor and /live.json both read: the snapshot,
                           flags, place board and register-by-place. SERVER ONLY.
src/config/markets.ts      The funds quoted when a licensed quote key is set.
src/lib/supabase/          Supabase clients. admin.ts is SERVER ONLY. See 6b.
src/lib/env.ts             Environment access and URL resolution.
src/lib/format.ts          Dates, issue numbers, reading time.
src/lib/og.ts              Font data and colours for generated images.
src/lib/structured-data.ts JSON-LD builders.
src/components/            Presentational components. Five client components:
                           site-nav, sign-in-panel, and the three in live/.
                           post-page.tsx is the one reading page for briefings,
                           articles and reviews; assessment.tsx is one exposure's
                           claim, shared by register entries and entity pages.
src/components/live/       The monitor's pieces. live-age, auto-refresh and
                           price-chart are client components; the rest are not.
src/app/monitor/           The live page. ISR, revalidate = 900. See 6d.
src/app/live.json/         The live snapshot, flags and place board. Same cycle.
src/app/articles/          Articles and long-term reviews. Static. See 6.
src/app/feed.json/         Every post — briefings, articles, reviews — as JSON Feed.
src/app/account/           The signed-in page and its server actions. Dynamic.
src/app/auth/              Magic-link callback and sign-out. Dynamic.
src/proxy.ts               Session refresh. NOT middleware.ts — renamed in Next 16.
src/app/entities/          Company and sector pages, derived from the register. See 6c.
src/app/register.json/     JSON Feed of the register — the alerting seam. See 6c.
src/app/                   Routes, metadata routes, icons, error boundaries.
src/assets/fonts/          IBM Plex TTFs, for icon and social card rendering.
                           Static instances — Satori throws on a variable font.
```

## 6. Content architecture

**Issues live in this repository as files. This repo is the archive of record.**
Beehiiv is the authoring tool and the email sender, not a runtime dependency. The
site never fetches the feed at request time or at build time.

- Pages and components import from `@/lib/content` and nothing else.
- **Pages must never import a source implementation directly**, reference RSS, or
  know that Beehiiv exists.
- Nothing under `src/` may import the RSS parser, `sanitize-html`, or anything in
  `scripts/`.

All three of those are enforced by `no-restricted-imports` rules in
`eslint.config.mjs`, so breaking the boundary fails the lint rather than quietly
coupling the site to an external service.

### Posts have a kind: briefing, article or long-term review

Everything written — the emailed briefing, articles and long-term reviews — is
written in Beehiiv and arrives through the same `npm run sync-issues`, so
publishing any of it stays the one step Rule 6 allows. **The kind comes from
the post's Beehiiv tags**: tag a post "Article" or "Long-term review" and it
files itself (`KIND_TAGS` in `src/lib/content/types.ts`; anything else is a
briefing). The sync prints where each post will appear. A `kind:` line in the
frontmatter overrides the tags for a hand-written file.

In the public API, "issue" still means a briefing — `listIssues()` and
`getIssue()` return briefings only, which is what every caller meant — and
`listArticles()` / `getArticle()` serve `/articles`. A briefing's slug 404s
under `/articles` and the reverse, so a post has exactly one URL. Slugs are
unique across all three kinds, because they share one directory.

Issue files are `content/issues/NNNN-slug.md`. `NNNN` is a **sort key, not the
issue number** — a numbering gap or a special issue must not corrupt ordering.
`slug` is **permanent**: once committed it is a URL someone may have linked, and
if it truly must change, add a redirect in `next.config.ts`. `issueNumber` may be
`null` and is never derived from directory position. The body is sanitised once,
at sync time, and read as-is thereafter.

### Failure modes, all handled in `local-files.ts`

- Malformed frontmatter logs a warning naming the file and is skipped. One bad
  file never takes down the build.
- An unparseable `publishedAt` means the date is omitted. **Today's date is never
  substituted.**
- A duplicate slug is refused, because slugs are permanent URLs.
- `getIssue()` returns `null` for an unknown slug and the route calls `notFound()`.

### Archive completeness

The repo holds every issue ever synced, permanently, so `/briefings` can honestly
be called a complete archive. **That depends on syncing before an issue ages out
of the feed window** (Beehiiv commonly exposes about twenty items). Any issue
published before this system existed must be back-filled — either sync it now
while it is still in the window, or write the file by hand.

## 6a. The register and the exposure chart

`src/lib/disruptions/` is the second typed content layer, built to the same
pattern as the first: its own types, its own source, its own public API,
enforced by the same lint rule. It is deliberately **not** merged into the issue
layer — an issue is a document, a disruption is a tracked state with an as-of
date, and they fail in different ways.

### The rule that makes the chart publishable

The exposure chart tells a reader that a named problem reaches a named company.
On a site about markets, someone may act on that. So:

> **An assessment that cannot be checked does not render.**

Every exposure must carry four things or it is dropped at load time, with a
warning naming the file:

1. **a mechanism** — the sentence explaining *how* the problem reaches the
   company. "Affected" is not a finding.
2. **a confidence** — `reported`, `inferred` or `estimated`.
3. **an `asOf` date** — when the assessment was last true.
4. **at least one source** — with a followable http(s) URL and a publisher.

A disruption with no source is skipped entirely. There is no way to produce a
coloured cell without all of this, and the enforcement is in
`sources/local-files.ts`, not in editorial habit. **Do not relax it.** If a
future change makes a field optional, the chart stops being defensible.

An entry not reviewed within `STALE_AFTER_DAYS` (21) shows as stale on its own
page rather than presenting itself as current.

**When staleness is evaluated, and why the wording matters.** Pages are static,
so "now" is the build time, not the moment someone reads the page. A day count
rendered on the page would therefore freeze at build and could only ever
*understate* an assessment's age — the dangerous direction. So the UI never
prints a live-sounding day count: it prints the absolute review date, which is
true forever, and phrases the warning against the build ("had not been reviewed
when this page was built"). Keep it that way unless the page stops being static.

**`listDisruptions()` returns summaries, not full entries.** The home page and
`/disruptions` both render every entry; shipping each one's analysis body into
those payloads would carry content nothing on the page displays. Use
`getDisruption()` when you need the body.

**Components import labels from `@/lib/disruptions/types`, not the layer index.**
The index pulls in the filesystem-backed source, so importing a label constant
from it drags `node:fs` into the module graph — which breaks the day a client
component uses one of those components. `types.ts` is pure data and safe
anywhere.

### Register file format

`content/disruptions/NN-id.md`. The numeric prefix is a filing convenience; the
`id` is the permanent URL.

```markdown
---
id: "panama-slot-restrictions"      # permanent, URL-safe
title: "Panama Canal slot restrictions"
shortLabel: "PAN"                   # 2–4 chars, the chart column header
status: "active"                    # watch | active | easing | resolved
category: "chokepoint"              # see DISRUPTION_CATEGORIES
startedAt: "2026-08-01"
updatedAt: "2026-09-10"             # the review date. Required.
summary: "One or two plain sentences."
author: "editor"                    # an id from publication.authors, or omit
places: ["panama"]                  # tracked place ids (src/lib/live/nodes.ts), or omit
sources:
  - title: "Advisory to Shipping No. 31-2026"
    url: "https://pancanal.com/..."
    publisher: "Panama Canal Authority"
    retrievedAt: "2026-09-10"
exposures:
  - entity:
      id: "example-co"
      name: "Example Co"
      kind: "company"               # company | sector
      ticker: "EXCO"                # or null — never invented
      sector: "Marine shipping"
    severity: "high"                # low | moderate | high
    confidence: "reported"          # reported | inferred | estimated
    mechanism: "How the disruption reaches this company, in a sentence."
    asOf: "2026-09-10"
    sources:
      - title: "Q3 trading statement"
        url: "https://..."
        publisher: "Example Co"
        retrievedAt: "2026-09-10"
---
<p>Optional sanitised analysis body.</p>
```

**Every date must be a quoted `"YYYY-MM-DD"` string, and the quotes are
load-bearing.** An unquoted YAML date is parsed by js-yaml before the loader
sees it, and js-yaml rolls impossible dates forward silently rather than
refusing them — measured, not assumed:

| Written unquoted | Becomes |
|---|---|
| `updatedAt: 2026-02-30` | `2026-03-02` — a day that does not exist |
| `updatedAt: 2026-13-01` | `2027-01-01` — **a year out** |

By the time such a value reaches `isoDate()` it is a valid `Date` and the
author's text is gone, so there is nothing left to check. A quoted string keeps
the text, which is the only thing that can be validated — so an unquoted date
is now warned about and the entry is skipped. The string form is narrow for the
same reason: `new Date()` reads `"10/09/2026"` as 9 October rather than
10 September, and `"September 2026"` as the 1st, so only `YYYY-MM-DD` (with an
optional time part, which is discarded) is accepted. This section tells the
reader to trust the review date over the freshness of the page, which makes a
silently shifted date the worst thing this layer can emit: plausible, precise,
and traceable to nobody.

**One entity id means one company, across every file.** `entity.id` is written
per-exposure, so the same company is described afresh in each file that
mentions it, and nothing used to check that those descriptions agreed. Two
files naming `acme-freight` with different tickers rendered this, on one page,
with no warning: the chart row said `Acme Freight / ZVZZT` while the table view
below it said `Acme Freight Group plc / ZWZZT`. The chart and the entity page
took whichever record loaded first; the table rendered each exposure's own
copy. `reconcileEntities()` in `sources/local-files.ts` now makes the first
occurrence in filename order canonical, rewrites every other mention to match,
and warns naming both files and every differing field. It **reconciles rather
than refuses** because the disagreement is over a display name, not a claim —
the mechanism, confidence, date and sources are all still intact — and dropping
a sound assessment over a metadata typo would be the wrong trade. This is worth
recognising as a shape: unreachable with one entry, near-certain with twenty,
and twenty overlapping entries is exactly what the chart exists to draw.

**`places` links an entry to the monitor.** It holds tracked place ids from
`src/lib/live/nodes.ts`; the monitor's place board then lists the entry beside
that place's live readings, and `/live.json` carries the link. An unknown id is
warned about and dropped (a correction, not a refusal). It is a statement about
geography only — naming a port says nothing about any company. The scaffolder
asks for it and validates it the same way (§12).

**`author` is how the register stays traceable with more than one writer.** It
holds an `id` from `publication.authors`; an id not on the masthead is warned
about and nulled rather than rendered, because inventing an attribution is
worse than falling back to the editor. The entry page shows **Recorded by** and
the feed carries `_novus.recordedBy` only once `hasCoAuthors()` is true — with
one author a per-entry byline just repeats the masthead on every page.

Add the second author *before* the first co-written entry. Retro-fitting
attribution to files that never carried it means guessing who wrote what.

`/debug/content` and `npm run doctor` list every warning the register raised.
Note that the warnings array mixes two things — claims the site **refused**
(an exposure missing one of its four fields) and values it **corrected** (an
unknown author id falling back) — so neither surface may describe all of them
as refusals. Each line says which it was.

### The chart's colour encoding

Severity is **magnitude**, so it uses a sequential single-hue ordinal ramp, not
a categorical palette and not a traffic light. Defined and justified in
`globals.css`; validated against `--ink` as an ordinal ramp (monotone lightness,
adjacent gaps above the floor, hue spread 3°, darkest step 3.06:1).

| Level | Token | Hex | Contrast on `--ink` |
|---|---|---|---|
| Low | `--sev-low` | `#44608F` | 3.06:1 |
| Moderate | `--sev-moderate` | `#7B92BE` | 6.19:1 |
| High | `--sev-high` | `#B4C8EA` | 11.45:1 |

On a dark surface the ramp runs dark → light as severity rises, because the
lightest step has to be the one that reads as "most". Severity is **never
carried by colour alone**: every cell states its level in visually-hidden text,
the legend is always present, a full table view sits below the chart, and a
texture channel takes over under `forced-colors`, `prefers-contrast: more` and
print.

Confidence is the second, non-colour channel: a solid cell edge for `reported`,
a dashed edge for `inferred` and `estimated`.

`--status-active` (`#E0A73E`) is the one warm value in the system and is
reserved for the "active" disruption status. **It is not available as a chart
series colour.** A status dot never appears without its word beside it.

The matrix is capped at nine columns so it never needs a horizontal scroll
container, which would clip the CSS hover cards. Below `lg` the matrix is
replaced by a per-entity list — same data, read down instead of across.

**The table is also capped in width, at roughly one column-width per
disruption**, and that is not cosmetic. `table-layout: auto` divides all
remaining width between however many columns exist, so at two disruptions each
cell was ~360px wide and the chart read as a bar chart, with a severity fill
large enough to dominate the page. That is not an edge case — it is the state
the register is in for its first months, which is exactly when the chart is
being judged. Capping the table rather than the cells keeps `table-layout:
auto`, so headers still size to their titles, and once there are enough columns
the cap exceeds the container and `w-full` takes over again.

## 6b. The account layer

`src/lib/accounts/` is a **contract with no implementation behind it**, built
the same way as the other two layers so that wiring real accounts later is
mechanical rather than a redesign. Nothing in the site imports it yet, and that
is correct — `sign-in-panel.tsx` is still a shell that sends nothing anywhere.

Four rules, written into `types.ts` and enforced where they can be:

1. **There is no credential field, and there must never be one.** No
   `password`, `passwordHash`, `salt`, `apiSecret`. An `Account` is a reference
   to an identity that a provider owns; `id` is the opaque subject that provider
   issues. There is structurally nowhere to put a secret, so nobody can
   accidentally persist one. The in-memory implementation also throws at runtime
   if an input object carries a credential-shaped key, because a value arriving
   as JSON is `unknown` until something checks it.
2. **No account record may be stored in this repository.** Account records are
   personal data; git history is permanent and widely readable. The real
   implementation belongs to a service with a database, per §14.2.
3. **Do not write bespoke authentication.** Hashing, session rotation, reset
   flows, rate limiting and breach response are a specialist job and the failure
   mode is other people's accounts. Use an established identity provider.
4. **Deletion ships with creation.** `deleteAccount` is in the interface from
   the first version, and it removes the record rather than flagging it.

`ACCOUNT_STORE` defaults to **`none`**, and `getAccountRepository()` then throws
a message naming what is missing. That is deliberate: a store that silently
accepted a signup and dropped it would be worse than having none.
`ACCOUNT_STORE=memory` is development only and `sources/memory.ts` refuses to
load in a production build, like both fixture sources.

### The Supabase implementation

`ACCOUNT_STORE=supabase` is the real store. Identity lives in Supabase's
`auth.users`; four tables hold everything else. Schema, policies and setup are
in **DEPLOY.md Part 4**.

**Sign-in is a magic link, and there is no password anywhere in the system.**
Not in the types, not in the database, not in the form. A password that does
not exist cannot be leaked, reused or mishandled, and it removes reset flows,
strength rules and breach response from the project entirely. `sign-in-panel.tsx`
therefore has no password input — adding one back would be a regression.

**Row-level security is the actual guard, not the code being careful.** Every
table has a policy restricting rows to `auth.uid()`. This is why the anon key
is safe to ship to browsers: it can only ever reach the signed-in reader's own
rows. Two consequences worth knowing:

- Under RLS, *not found* and *not permitted* are indistinguishable. That is
  correct — it means one reader cannot probe for another's account.
- `findByEmail()` only ever resolves the signed-in reader's own address. There
  is deliberately no way to ask this system whether an arbitrary address has an
  account, because that is an enumeration hole.

**`SUPABASE_SERVICE_ROLE_KEY` bypasses every policy.** It is used for exactly
one thing — deleting from `auth.users`, which the anon key cannot do. The
realistic way it leaks is not theft but somebody prefixing it with
`NEXT_PUBLIC_` to silence an undefined variable, which inlines it into the
browser bundle. `src/lib/supabase/admin.ts` **throws at module load** if it
sees such a variable, and again if it is ever reached from the browser.

That check alone is not enough on its own, because `admin.ts` is reached only
through a dynamic `import()` in `getAccountRepository()` — so a production build
never evaluates it, and the prefix mistake produces a green build that only
fails later, on the first request to an account route. `input-ledger.ts` carries
the same check, and that file *is* imported by the root layout, so the build
refuses at the moment the key can still be rotated before anything is served.
It is deliberately **not** gated on `NOVUS_ALLOW_INCOMPLETE`: that flag means
"facts I have not supplied yet", which is legitimate; a credential in the
browser bundle never is.

**Session refresh lives in `src/proxy.ts`, not `middleware.ts`** — Next 16
renamed the convention and every Supabase guide still shows the old name. It
does nothing but rotate the token; authorisation is `getUser()` in the route
that needs it, which revalidates against Supabase rather than trusting a
cookie.

When accounts are genuinely live, delete `memory.ts` — do not extend it.

## 6c. Entity pages and the register feed

Two surfaces derived from the register rather than stored separately. Neither
adds a content layer: both read `@/lib/disruptions` through its public API.

### `/entities` and `/entities/[id]`

A company or sector is the second thing a reader arrives looking for, after a
disruption, and it is a different question — *what reaches this name, and how
well established is it*. It gets its own permanent URL.

`entity.id` is already validated URL-safe at load time (`ID_PATTERN` in
`sources/local-files.ts`), so the route space is enforced, not hoped for.

Three rules this page holds to:

1. **No composite score, ever.** The page shows the *strongest* single
   assessment — a real maximum across the open claims — and the count. It never
   blends severities into one number. A composite would be the one invented
   figure on a site whose entire argument is that it publishes none: it would
   look like data, travel like data, and trace back to nothing. The same applies
   to the social card, which travels further than the page and is read with less
   care.
2. **Resolved exposures stay visible.** When a disruption resolves it leaves the
   chart, but the entity page keeps it under *Resolved*. An assessment that
   simply vanishes is indistinguishable from one that was wrong, and being
   checkable after the fact is the whole claim.
3. **The URL outlives the exposure.** `listEntityIds()` includes entities whose
   every disruption has resolved, so a page that was linked does not start
   404ing. It says the exposure resolved instead.

There is deliberately **no JSON-LD on entity pages.** Marking up a company you
neither own nor represent as a schema.org `Organization` asserts a relationship
to that business that does not exist. The register entry pages, which describe
Novus Data's own analysis, keep theirs.

Reached from the chart's row headers, the register entry's exposure list, the
home page's "most exposed" rows, and the footer. **Not in the header** — a sixth
header item to reach a seventh page costs more than it earns, and a reader is
already on the chart when the question occurs to them.

### `/register.json`

JSON Feed 1.1 of the register. This is the seam described in §14.2, and it is
**the register rather than the briefings** because alerts do not fire on
newsletters — they fire on a disruption opening, escalating or being
re-reviewed.

**Items are current state, not events.** There is no event log in this
repository: a register entry is a file holding the assessment as it stands, not
a history of how it got there. Emitting `opened` / `escalated` transitions would
mean inventing events nobody recorded. So a watcher diffs instead — it keeps the
last `date_modified` and `_novus.severity` it saw per `id` and fires when an id
is new or either value moves. Every value it compares is one a human wrote and
dated.

`_novus.entities` carries the entity ids reached, which is what lets a watcher
match a disruption against a reader's `watchlist.entityIds` (§6b) and link
straight to `/entities/<id>`. That closes the loop between the three layers.

**`_novus.entityNames` maps those same ids to display names**, and it exists
because building the alerts prototype made the gap obvious. `entities` stays a
plain id array — matching a watchlist is the common case and an array of
strings is the cheapest thing to intersect — but a notification has to name
something a person recognises, and a client holding ids alone has two bad
options: title-case the slug, which gets "Bhp Group" wrong the first time it
matters, or fetch one entity page per id on every poll. It is a map rather than
a parallel array so it cannot fall out of order with `entities`, and so a
consumer that does not need names can ignore one key.

Nothing else in the feed is derived. `severity` is a real maximum across the
open exposures rather than a blend, matching the entity pages; there is no
composite score, no trend and no count-based ranking, because a number that
travels without its page is read with far less care than one sitting next to
its sources.

It is statically generated (`dynamic = 'force-static'`) like everything else.

**Feed discovery is a `<link>` in the root layout's tree, not
`metadata.alternates.types` — and that is not a style preference.** Declaring it
as metadata looked correct and rendered nothing: Next merges metadata per
top-level field, so any page that sets its own `alternates` replaces the
layout's object wholesale and takes `types` with it. Every page here sets
`canonical`, so the feed link never appeared on a single route. Declared as an
element instead, React hoists it into `<head>` everywhere. **Do not "tidy" it
back into metadata** — it fails silently, on every page, with nothing in the
build output to say so.

## 6d. The live layer and the monitor

`src/lib/live/` is the fourth typed layer — the one §14.1 anticipated, built
the same way as the other three: its own types, sources behind a public API,
the same lint boundary. A time series has a different shape, refresh cadence
and failure mode from a document or a tracked assessment, so it is not bolted
onto either. `/monitor` renders it; `/live.json` publishes it.

**The author's decision, recorded.** §14 said none of this should be coded
until issues were publishing on a schedule. The author overrode that and asked
for live, close to real-time data with a fifteen-minute update period. That is
their call; what follows is how it was made safe to publish.

### Nine feeds

| Source | What the page reads | Key |
|---|---|---|
| GDELT Event Database 2.0 (raw 15-minute files) | Where conflict reporting is above its own normal — places, countries, kinds of problem | none |
| AISStream (WebSocket) | Vessels heard in a box across each of ten chokepoints, in a 30-second sample | `AISSTREAM_API_KEY` |
| USGS | Earthquakes M4.5+, past day | none |
| GDACS | Orange and red disaster alerts, past 14 days | none |
| NOAA NHC | Active tropical cyclones, Atlantic and E. Pacific | none |
| NASA EONET | Open natural events within 300 km of a tracked location | none |
| Open-Meteo | Current wind at twelve container ports | none |
| FRED (EIA and Federal Reserve data) | Brent, WTI, Henry Hub gas, US diesel, the broad dollar — daily settlements | none |
| Finnhub | Share prices of five funds plus exposure-chart tickers | `FINNHUB_API_KEY` — **licensing decision, see Terms** |

Seven need no key. Without a key, a keyed panel says "not switched on yet" and
nothing else changes.

### The rule the layer exists to enforce

> **A reading's age comes from a timestamp inside the upstream data, never
> from our clock.**

Every layer between a publisher and a reader can serve a value long after it
arrived: the fetch cache, ISR, a CDN, a tab left open overnight. A reading
stamped with our render time would describe a two-hour-old number as current —
exactly what §14.1 warned "would destroy more credibility than this whole site
builds". So each adapter takes `asOf` from inside the payload (the feed's own
generated time, the latest observation in it) via `resolveAsOf()` in
`sources/http.ts`, falls back to the HTTP `Date` header only with a note
saying so, and otherwise refuses. **Do not add a fallback to `new Date()`.**

The **age** is then computed in the reader's browser, against the reader's
clock, and keeps ticking (`components/live/live-age.tsx`). The server renders
only the absolute time, which stays true forever — the same move §6a makes
for review dates. Freshness (*Live / Delayed / Stale*) is judged per source,
because cadences differ by orders of magnitude: a vessel count is old after
thirty minutes, an EONET event is curated daily. Windows are in `clocks.ts`.

### What's changing: how "above normal" is measured

The author asked for "what is changing, where problems are rising, points of
interest, flag locations with an abnormal amount of articles" — explicitly
*not* how much of the news is on each topic, which is what the first version
drew. `sources/gdelt.ts` now answers that question, and the method is
published on `/monitor` and at `/about#live`:

- **Input:** GDELT's raw 15-minute event exports (61 tab-separated columns,
  no header, checked on every row). Conflict-type events only — CAMEO
  QuadClass 3 and 4. "Reports" is GDELT's `NumArticles`: articles that
  mentioned an event geocoded to a place. **It counts reporting, not events.**
- **Window:** the last three hours (12 files) against the **same three hours
  on each of the previous seven days** (28 files, 45 minutes apart). The
  time-of-day match is load-bearing: the mix of the world's news shifts with
  the sun, and an all-day baseline flagged Asian ports every night.
- **Shares, not counts:** a place's share of *all* reporting now, divided by
  its share in the baseline. World news volume swings through the day; a
  share cancels that. A multiple is never divided by less than `minExpected`
  (2), so a first appearance reads as large, not infinite — **and when that
  floor applies the comparison is marked `floored`**, the multiple prints as a
  lower bound (`≥183×`), and the text says "fewer than 2 would be normal".
  `expected` itself is always the measured value. The first real run is why:
  the page said "365 reports, against about 2 normally" when normal was
  near zero, stating the floor as though it had been measured.
- **Outputs:** city-level hotspots (≥20 reports and ≥3× normal, ranked by
  reports above normal), countries (≥50 and ≥2×), ten kinds of problem by
  CAMEO code (strikes 143, blockades 144/191, sanctions 163, seizures 171 …),
  and every tracked place (surging ≥3×, elevated ≥2×, with ≥10 reports).
- **Three events, not one story (`minEvents`).** A hotspot, or any level above
  normal at a tracked place, also needs its reports spread across at least
  three separately coded events. `NumArticles` is per event, so one miscoded
  or widely syndicated story can carry hundreds of reports alone; a single
  event row is the likeliest false alert this method can produce.
- **Radii are per kind, and tighter than the hazard radius.** Stories are
  geocoded to a city, and at 300 km one strike in Rotterdam raised alerts for
  Rotterdam, Antwerp *and* the Strait of Dover. Ports and clusters use 100 km;
  chokepoints 200 km, because attacks on shipping are placed at the nearest
  coastal city (Aden is ~180 km from Bab el-Mandeb).
- **Each story counts for one port and one chokepoint at most — the nearest
  in reach** (`placesCounting()`). Tighter radii were not enough: Rotterdam
  and Antwerp are 77 km apart and Shanghai and Ningbo 80, so their 100 km
  circles overlap, and the first real run showed Rotterdam and Antwerp
  surging together. A port and the chokepoint it sits on may both count
  (Singapore and its strait are 12 km apart) — that overlap is geography.
- **A place may set its own radius, and most near a big city do**
  (`TradeNode.reporting` in `nodes.ts`: `km`, optional `exclude` by GDELT
  place-name prefix, and a `why` the page prints). The rule for choosing
  one: keep the place's own towns in, keep out any large city whose news is
  not about the place. The second real run is why — at the default 200 km
  the Dover Strait took in London (126 km) and "surged" 815 against 180;
  Suez took in Cairo; Rotterdam The Hague (22 km, the international courts);
  Antwerp Brussels (48 km, the EU). The Hague and Brussels sit too close to
  cut by radius, so they are excluded by name, and **the nearest place's
  exclusion is final** — The Hague must not fall through to Antwerp. Taipei
  stays inside the Taiwan Strait's radius deliberately and the entry says
  why. Check any new place against the major cities around it before adding
  it; the probe that found these is a ten-line script over `ALL_NODES`.
- **A city with no measurable normal is listed, never flagged**
  (`noBaseline`, "Usually absent from the news"). In both real runs every
  such hotspot was one story reprinted across a newspaper group (Gosport:
  gazetteherald, thetottenhamindependent, northwaleschronicle — one chain)
  or a geocoding error (Winn Parish, Louisiana, sourced to
  winnipegfreepress.com). Only cities above a *measured* normal are
  hotspots, and only they can raise a flag. Tracked places still flag on a
  floored normal — their radius is chosen, and a port that is never in the
  news suddenly being in it is the case the board exists for — **but only as
  a watch, never an alert.** "Surging" claims a trend and there is no
  measured normal to have one against; the fourth run had the Dover Strait
  at 90 against 0, all of it one chain-syndicated story placed in Folkestone.
  Alerts are what the app will notify on (§14.2), so this is the line that
  keeps a reprinted local story from waking anyone.

Every threshold lives in `REPORTING_RULES` in `types.ts`, and the page prints
them from there. Change one and the published method follows.

**Why the raw files, not GDELT's query API.** The DOC 2.0 API refused every
request from GitHub's runners in both real runs (429, then timeouts). The raw
exports are static downloads with no request limit, and each is immutable once
published, so each file is fetched with a nine-day `revalidate`: after the
first cycle, a regeneration downloads only the newest file or two and reads
the rest of the baseline from the fetch cache. The zip reader is
`sources/unzip.ts` — Node's zlib, no dependency (Rule 4).

### Flags and the place board

`derive.ts` builds two things from a snapshot, purely, so `/monitor`,
`/live.json` and any client compute the same result:

- **Flags** — every rule in `FLAG_RULES` firing on a reading: conflict
  reporting surging or elevated at a place, a worldwide hotspot above a
  measured normal, an M6+ quake
  or PAGER orange/red, a GDACS red (or orange near a place), a cyclone near a
  place, a gale (or near gale) at a port, a natural event near a place, a 5%
  daily move in crude. Each carries its rule in words, the reading's own time,
  its source and a place id. **A flag is a rule firing, not a judgement**; it
  never blends readings or says what they mean for a company. A flag's `id` is
  stable while its condition holds, so a watcher diffs `/live.json` flags
  exactly as it diffs the register (§6c).
- **The place board** — every tracked place, one row: reporting level, hazards
  within reach, wind or ships, flag count, and the register entries whose
  `places` name it (§6a). Nothing is combined into a score. Flagged places sort
  first; the rest keep their fixed order.

### Three shapes, and no fourth

A `Reading<T>` is `ok` (data, `asOf`, `asOfBasis`, notes), `unavailable` (a
reason **we** wrote — never an upstream error body, never a secret) or
`not-configured` (the name of the variable that would enable it). The page
renders all three plainly. There is no shape that means "show the last value"
or "show zero", and `ReadingBlock` is the only frame a panel is drawn in.

Every source is settled independently (`sources/index.ts`): a feed that is
down, slow, rate-limited or reshaped becomes one panel saying so, and never
takes the page down or delays the others beyond its own timeout.

### How "every fifteen minutes" actually works

- `/monitor` and `/live.json` export **`revalidate = 900` as a literal.** Next
  16 reads it statically; `LIVE_REVALIDATE_SECONDS` imported from `types.ts`
  would be silently ignored. Same for `maxDuration = 60`.
- ISR is stale-while-revalidate: the first request after fifteen minutes gets
  the cached page and starts a regeneration; the next gets the new one. If a
  regeneration throws, the last good page keeps being served — which is safe
  only because every reading on it carries its own time.
- Fetches pass `next: { revalidate: 900, tags }`. Next 16 does **not** cache
  `fetch` by default; a stale entry is re-fetched, not served, and only HTTP
  200s are stored, so an upstream error is never cached. **Never use
  `cache: 'no-store'` here** — it makes the route dynamic, and every reader
  would then cost every publisher a request.
- The AIS sample is a WebSocket, which Next does not cache at all; it is
  simply re-sampled on each regeneration.
- An open tab calls `router.refresh()` every five minutes while visible
  (`auto-refresh.tsx`). Five, not fifteen, because checking on the same cycle
  as regeneration can land just before a new version exists and show it a
  full cycle late; between regenerations each check is a cache hit.
- Build time: `/monitor` is prerendered during `next build`, so a build does
  one full read (about 35 seconds). That is inside the default 60-second
  static generation timeout, with little to spare — do not add sources that
  push a regeneration past it without raising `staticPageGenerationTimeout`.

### Traps specific to this layer

- **GDELT's raw read runs inside a 30-second budget**, eight files at a time
  with 10-second timeouts, and skips what would overrun. A missing file costs
  one slot (GDELT does occasionally skip an interval); below 8 recent or 14
  baseline files the comparison is not made and the panel says why. Parsing
  ~40 files is CPU work on the same thread as the AIS sample — acceptable at
  this size, but do not widen the window without measuring.
- **Keys travel in headers, never URLs.** Finnhub's goes in `X-Finnhub-Token`
  so nothing that logs URLs can capture it. Both keys have build guards in
  `input-ledger.ts` against a `NEXT_PUBLIC_` prefix.
- **The AISStream key is server-only.** It is read once in `sources/index.ts`,
  passed to the adapter, sent only inside the subscription message, and never
  stored on a `Reading`, logged, or placed in `/live.json`. `input-ledger.ts`
  refuses to build if `NEXT_PUBLIC_AISSTREAM_API_KEY` exists, for the same
  reason it refuses the Supabase service role key.
- **A zero vessel count means no signal, not no ship.** The table shows "No
  signal in this sample" instead of a zero bar. Rows are in fixed order and
  never ranked: receiver coverage differs by strait, so the rows are not
  comparable, and rows that reshuffle every update hide the change a reader
  is scanning for. SOG 102.3 is the AIS "not available" sentinel and is
  excluded; "under way" means at least 1 knot.
- **Client components must not use `Intl` for dates.** Node and browsers ship
  different ICU data ("Sep" against "Sept" in en-GB), which is a hydration
  mismatch on every timestamp. `display.ts` builds strings from UTC fields by
  hand. Server-only pages may keep using `src/lib/format.ts`.
- **Components never import `@/lib/live`** (lint-enforced). The index reaches
  the adapters; one careless import from a client component would ship the
  fetch code into the browser bundle.

### Trade nodes are places, never companies

Hazards are measured against `nodes.ts`: ten chokepoints, twelve container
ports and three semiconductor clusters, all named by place. A distance to a
port says nothing about any business that uses it, and naming a company here
would be an exposure claim that skipped every requirement in §6a. "Within
300 km" (`PROXIMITY_KM`) is stated on the page as a distance, not an impact.

### The charts

- **Energy prices** are small multiples, one per series — never one axis for
  dollars a barrel, dollars per million Btu and an index. Each is scaled to
  its own six-month low and high, labelled on the right (the financial
  convention), because a price level is not a magnitude from zero. Changes are
  written with a real minus sign and never coloured red or green: colour would
  make a direction look like a verdict. `components/live/price-chart.tsx`, with
  a keyboard-operable crosshair.
- **Kinds of problem** are a dumbbell per row: normal share and share now on
  one common axis, a legend (two series), and both values written out.
- **Tracked places against their normal** (`components/live/against-normal.tsx`)
  is a dot per place on a **logarithmic** axis of "times normal", because a
  multiple is a ratio: 0.5× and 2× sit equally far from normal, and one place
  at 40× does not flatten the rest. The published thresholds are drawn on the
  axis (1× solid, 2× and 3× dashed, from `REPORTING_RULES`). Emphasis form:
  above normal in `--accent-text`, normal in muted grey, too few reports to
  judge as a hollow ring. The plot is inset so a mark at either end is not
  clipped.
- **Countries against their normal** is a bar per country from zero, with a
  tick where normal would be — magnitude, so a linear axis shared by all rows.
- **Chokepoints** are a fixed-order table with inline bars.

Marks use existing tokens only: `--accent` for bars and lines (3.1:1 on
`--ink`, its sanctioned structural use) and `--accent-text` for the emphasised
point. `--status-active` is never a chart colour. Hand-written SVG and styled
cells, no chart library (§7).

### Terms — read before monetising

- **Open-Meteo's free API is non-commercial only.** Its terms treat a site
  with subscriptions or advertising as commercial. The day Novus Data charges
  or runs ads, this source needs a paid plan or has to go.
- **GDELT** permits commercial use but requires a citation and a link to
  gdeltproject.org wherever the data is used; the page and `/live.json` carry it.
- **FRED's series here are U.S. government data** (EIA, Federal Reserve
  Board) and in the public domain; FRED asks to be cited, and the page does.
  This is why energy prices could be added at all.
- **Stock quotes are the strict one.** Every free tier checked — Finnhub's
  included — is personal, non-commercial use, and a public website showing
  prices is redistribution. The adapter is built and tested but **off by
  default**; setting `FINNHUB_API_KEY` on the public site is a licensing
  decision (DEPLOY.md Part 6), not a configuration step. Only funds and
  exposure-chart tickers are ever quoted (`config/markets.ts` explains why a
  hand-picked list of named companies would be an unsourced exposure claim).
- The rest are marked "not verified in this build" in `meta.ts` rather than
  given a plausible-sounding licence. Verify them before charging.

### Verified against the real feeds — findings

The environment this layer was built in could not reach any of the seven
hosts, so `.github/workflows/live-check.yml` runs `npm run live:check` on a
GitHub Actions runner (open internet) for every PR that touches the layer.
Its log is the record. First run, 22 September 2026:

| Feed | Result |
|---|---|
| USGS | **Parsed.** 14 quakes; `asOf` from `metadata.generated`, 2 min old |
| GDACS | **Parsed.** 7 orange/red alerts; 3 min old. (The adapter written with least certainty.) |
| NOAA NHC | **Parsed.** 3 active storms; latest advisory 48 min old |
| NASA EONET | **Parsed.** 48 open events, 2 within 300 km of a tracked location |
| Open-Meteo | **Parsed.** All 12 ports; latest model interval 3 min old |
| GDELT DOC API (the first design) | **Refused — HTTP 429 on every request**, each taking ~11 s to arrive; timeouts on the second run. Replaced by the raw event files — see "What's changing" |
| AISStream | Not run — no key in the repository's secrets |

**What the GDELT result changed.** Five slow refusals plus the pacing gaps
took 78 seconds — past both the route's 60-second `maxDuration` and Next's
60-second limit for prerendering a page at build time, so it would have failed
a Vercel deploy. `fetchGdelt()` now stops at the first 429 (once a server is
refused, the rest of the cycle is refused too) and runs inside a 32-second
budget with 8-second per-request timeouts; what it did not reach is reported
as "not requested this cycle". Simulated: an instant 429 now costs one
request and 0.1 s, eleven-second answers cost 21.5 s, success is unchanged.

**The open question was whether GDELT's API would serve Vercel at all**, and
two refusals from shared cloud IPs answered it well enough: the adapter now
reads the raw fifteen-minute files instead (see "What's changing").

Third and fourth runs, 23 September 2026 — the raw-file adapter and FRED,
first contact, then the same with each hotspot's evidence printed:

| Feed | Result |
|---|---|
| GDELT raw event files | **Parsed.** 12/12 recent and 28/28 baseline files; 84,669 reports, 22,414 conflict-type; 12 hotspots, 10 countries above normal; 3 min old. **The whole read, all nine feeds, took 1.4 s** — against 78 s for the API it replaced |
| FRED | **Parsed.** All five series; Brent, WTI and Henry Hub latest 15 Sept, diesel 21 Sept, dollar 18 Sept. `asOf` 18 Sept = 5 days, **Delayed**. The three EIA series all ending on the same day, eight days back, is consistent with EIA publishing daily spot prices in weekly batches — so the 8-day stale window sits right at the edge, and each series prints its own date on the page for exactly this reason |
| USGS, GDACS, NHC, EONET, Open-Meteo | **Parsed** again, all Live |
| AISStream, Finnhub | Not run — no keys in the repository's secrets |

What that run showed, and what changed because of it:

- **The top hotspots were small places with near-zero normals** — Gosport
  182.5×, Burnham (Somerset) 100×, "Cape Cod, Florida" 81.5× (GDELT's geocoder;
  Cape Cod is in Massachusetts). Dividing by the floor made those multiples
  look measured, which is what `floored` now fixes. The next run printed
  what they rested on: many events each (13 for Gosport, so `minEvents`
  would not have caught them) but one syndicated story apiece, and one
  outright misreading — Burnham, Somerset was sourced partly to the
  *Maldon and Burnham Standard*, which covers Burnham-on-Crouch in Essex.
  That is what moved them to `noBaseline`.
- **Dover, Rotterdam and Antwerp were all "surging" at once**, for two
  different reasons. Rotterdam and Antwerp: overlapping circles — every
  story placed in Rotterdam is 72 km from the Antwerp node and counted for
  both. Fixed by nearest-only counting, above. Dover: the 200 km circle
  reached Gosport (186 km) and, far worse, London (126 km) — the next run
  had Dover at 815 reports against a normal of 181. Fixed by the Dover
  Strait's own 65 km radius, above.
- **With those rules, the fourth run read sensibly.** Measured hotspots:
  Pituffik (Greenland), Kigali, Ciudad Juárez, a Sydney suburb and
  Brussels, each above a normal it actually has. The chain-syndicated
  items (Gosport, Folkestone, "Cape Cod, Florida") sat in the no-baseline
  list, where they belong. The one place that still moved was the Dover
  Strait, from that Folkestone story, which is why a place with no measured
  normal now tops out at a watch. Three runs is not a calibration: read
  `live:check` again after a week in production before touching a
  threshold.
- **Speed is not the constraint any more.** `live:check` runs outside Next,
  so it has no fetch cache at all: 40 files downloaded, unzipped and parsed
  from cold in 1.4 s. A cold production regeneration is therefore far inside
  the 30-second budget, and after the first one the cache cuts it to one or
  two downloads.

To verify AIS the same way, add a repository secret named `AISSTREAM_API_KEY`;
the workflow passes it through, and the script prints only whether it is set.

### What it deliberately does not do

- **No history or baseline.** "Is 11 vessels in the Taiwan Strait low?" needs
  a record of previous samples, which needs somewhere to store them. This
  repository stores no data (§13); a baseline is a decision about a store, not
  a code change.
- **No alerting.** A watcher that polls `/live.json` and notifies readers is
  the separate service in §14.2.
- **No freight rates, and no stock prices by default.** Energy prices come
  from public-domain government data; share prices only behind a licensed key
  (§13). Commercial freight indices (Drewry, Freightos, Baltic) remain out.

## 7. Dependencies

Runtime: `gray-matter`, `clsx`, `@tailwindcss/typography`, and — only because
accounts were authorised (§13) — `@supabase/supabase-js` and `@supabase/ssr`.

The Supabase packages were added under Rule 4 with the author's explicit
instruction to build sign-in. They are the *only* reason a database client
appears in a project that otherwise forbids one, and they are loaded through
dynamic `import()` at every call site, so a build with `ACCOUNT_STORE` unset
never pulls them into its graph.

**There is no charting library and there should not be one.** The exposure chart
is a `<table>` of styled cells, which is why each cell can be a link, hold
visually-hidden text and take keyboard focus. The monitor's price charts are
hand-written SVG in `components/live/price-chart.tsx`, and its bars and
dumbbells are styled elements, for the same reasons. A canvas or SVG chart library
would lose all three and add a client bundle to a page that currently ships no
JavaScript at all.
Dev (sync script and review tooling only): `fast-xml-parser`, `sanitize-html`,
`@types/sanitize-html`, `tsx`.

Forbidden without asking: any UI kit, animation library, state library, CMS,
any *further* database client, `moment`/`date-fns` (use `Intl.DateTimeFormat`),
analytics package, test framework, MDX tooling, or icon library.

## 8. The publishing workflow

This is the one recurring manual step in the project.

```
1. Write and send the issue in Beehiiv, as normal.
   An article or long-term review is written there too — publish it to the
   web and tag it "Article" or "Long-term review"; it then files itself
   under /articles (§6). No other step.
2. npm run sync-issues
3. Review the new file in content/issues/ — check the HTML converted cleanly.
4. git add content/issues/ && git commit -m "content: add issue N"
5. git push   (Vercel deploys automatically)
```

**Sync promptly after each send.** An issue that falls out of the feed window
before syncing is not recoverable by the script and has to be copied by hand.

## 9. Design tokens

Defined in `src/app/globals.css`. Derived from the existing Novus Data logo and
settled — do not reinterpret them.

| Token | Hex | Role | Contrast on `--ink` |
|---|---|---|---|
| `--ink` | `#070C20` | Page background | — |
| `--surface` | `#0E1529` | Raised panels | — |
| `--surface-2` | `#161F38` | Hover / secondary raised | — |
| `--border` | `rgba(255,255,255,0.08)` | Default hairline | — |
| `--border-strong` | `#222D4A` | Emphasised division | — |
| `--text` | `#F4F6FA` | Primary text | ~17:1 |
| `--text-muted` | `#9395A0` | Metadata, secondary text | 6.5:1 |
| `--accent` | `#4C618A` | **Structural only** — borders, fills, non-text marks | **3.1:1 — fails AA for text** |
| `--accent-text` | `#7B92BE` | Links, focus rings, interactive text | 6.2:1 |

**`--accent` is structural-only.** `#4C618A` fails WCAG AA for body text on the
navy background at 3.1:1 against a 4.5:1 requirement. Use `--accent-text` for
anything read or clicked. **Do not "correct" this back during a polish pass.**

**Reading surface (settled — do not relitigate):** the site is dark throughout,
issue pages included. Long-form legibility is handled by type, not by inverting
to a light theme mid-site: body at `1.125rem` / `1.75` in `--text` (17:1), measure
capped at 66ch. A light article page inside a dark site fragments the brand.

### Typography — amended twice by the author. This is the current state

The palette above is unchanged and has been through both amendments untouched.
The **typefaces have been replaced twice**, and the second replacement reverses
the first. Both are the author's call. The history matters because the reasoning
of the first is still quoted in places, and because reverting to it would undo a
decision that was made deliberately.

| Role | v1 | v2 | **Now (v3)** |
|---|---|---|---|
| Words — headlines, ledes, summaries, body, issue bodies | Source Serif 4 | Newsreader | **IBM Plex Sans** |
| Interface — navigation, labels, buttons | Inter | Libre Franklin | **IBM Plex Sans** |
| Figures — dates, counts, tickers, the kicker | — | — | **IBM Plex Mono** |

**One family, plus its monospace sibling for figures.** v2's serif/sans split is
gone: there is no `--font-serif` token, no `font-serif` utility anywhere in
`src/`, and no per-element `font-family` block in `@layer base`. The family is
set once on `body` and inherited. v2 needed two rules plus an opt-out list
(`nav p`, `button`, `label`, `th`, `.text-meta`, `[data-ui]`) to keep interface
text out of the reading face; none of that has to exist now.

**Why this reverses v2 without contradicting it.** v2 argued that "a publication
that sets its body copy in a UI sans reads as a web app about finance rather
than as a financial publication", and that argument is sound *about the face it
was aimed at*. The face was **Inter** — the sans a generated page reaches for,
and the actual tell. Plex is the opposite of a default: a corporate family with
real quirks, and setting every figure in Plex Mono is a terminal convention no
template arrives at by accident. The brief this answers was that the site still
read as generated; the fix is a face with an opinion, not a different serif.

**What survived the reversal is the division of labour, narrowed.** v2 had
*serif reads, sans operates*. v3 has **words are Plex Sans, figures are Plex
Mono** — and that is not a flourish. Every figure on this site sits in a column
with others like it: a `<dl>` of review dates, an "as of" column, a count of
names affected. A proportional face makes those ragged because its digits are
not the same width. Mono plus `tabular-nums` makes them a table the eye reads
straight down. **Plex Mono is deliberately unavailable for running text** — a
monospace paragraph is a code block, and nothing here is code.

Four details that will look like mistakes and are not:

1. **`word-spacing: -0.2em` on `time` and `[data-numeric]`, and `-0.18em` on
   `.kicker`.** A monospace word-space is a full character wide — roughly
   `0.6em` against a proportional face's `0.25em` — so "09 Sept 2026" renders
   with visible holes in it. Letter-spacing cannot do this job; it would close
   the digits up too. Without this the dates read as three values, not one.
2. **Mono is sized at `0.94em`, not `1em`.** Plex Mono is drawn considerably
   wider than Plex Sans, so matched pixel sizes do not look matched.
3. **Tracking went more negative and leading came down.** Plex Sans sits on a
   wider, more open chassis than Newsreader, so v2's letter-spacing left a sans
   headline loose and unresolved: display is now `-0.028em` (was `-0.014em`) and
   title `-0.022em` (was `-0.011em`). Leading drops slightly at every step,
   including the reading size from `1.75` to `1.7`, because a sans has no serifs
   bridging glyphs along the baseline and the eye needs less leading to avoid
   doubling back. **The sizes themselves are unchanged from v2** — the scale was
   not the complaint.
4. **The kicker is mono.** In print a letterspaced uppercase label is set in the
   paper's sans because that is all a press had; on a terminal it is monospace,
   because a terminal had nothing else. This is the single clearest signal of
   the change, and it is why `.kicker` is still editorial furniture and still
   must not be used for form labels or inline metadata.

**The wordmark is Plex Sans, not Plex Mono**, at `-0.022em`. Mono is reserved
for figures and the kicker; a wordmark set in it reads as a filename rather than
a masthead, and the header renders it at 1rem where legibility matters most.

**`src/assets/fonts/` and `src/lib/og.ts` are part of this and must move with
it.** Generated cards and icons cannot read the CSS, so they carry their own
copies: `PlexSans-SemiBold.ttf`, `PlexSans-Bold.ttf`, `PlexMono-SemiBold.ttf`.
A card in a different typeface from the page it links to reads as two different
products, and a card travels further and is judged faster than the page. Satori
throws on a variable font's `fvar` table, so these are static instances, checked
for the absence of `fvar` before being committed — verify the same way if they
are ever replaced. IBM Plex is SIL Open Font License, so redistributing it here
is permitted, on the same basis Newsreader was. The helper is `cardFonts()`; it
was `serifFonts()`, which is no longer a true name.

**Density is part of the same change.** Section rhythm went from
`mt-20 sm:mt-28` to `mt-12 sm:mt-16` and register rows from `py-6` to `py-4`,
which fits roughly half again as much on a screen. Generous whitespace is the
other loud tell; a financial paper is dense because its readers are scanning.

**Two pieces of newspaper furniture** are defined in `globals.css` and should
be used rather than reinvented:

- `.kicker` — the small letterspaced uppercase label above a headline that says
  what *kind* of thing follows. It does a coloured pill's job but belongs to
  print. Use `.kicker-muted` where it should recede. **It is editorial
  furniture, not a general small-text style** — do not apply it to form labels
  or inline metadata.
- `.section-rule` — a 2px rule that opens a band of the page. Hairlines divide
  items; this divides sections. Having both is what gives a broadsheet its
  structure.

`PageHeader` now closes with a rule. The earlier note that "a rule under every
page title is decoration" holds for a web page, but a masthead is exactly where
a rule carries meaning: it closes the title block and opens the content.

### Print and PDF — the palette inverts, and the severity ramp inverts with it

`@media print` at the end of `globals.css` redefines the same tokens rather than
adding a second set of rules, so anything styled through `--ink` / `--surface` /
`--text` / `--text-muted` follows on its own.

**This was a real defect, not a polish item.** A browser's print dialog drops
background colours unless the reader ticks the box, so before this block a
printed page was `--text` (`#F4F6FA`) on white paper — about **1.07:1**, i.e.
blank. The reader who PDFs a register entry to forward to a colleague is the
exact reader §2 describes, and the page they forwarded was empty.

Four decisions in there are load-bearing:

1. **The severity ramp inverts.** §6a fixes the screen ramp dark → light
   because "the lightest step has to be the one that reads as most" on a dark
   ground. On paper that ordering reverses, so the screen ramp would make the
   encoding say the opposite of what it means. The print ramp is single-hue
   blue, hue spread 2°, monotone lightness, with the step nearest the paper
   still clear of the 3:1 a non-text mark needs:

   | Level | Print token | L\* | Contrast on white |
   |---|---|---|---|
   | Low | `#7590BF` | 59.1 | 3.27:1 |
   | Moderate | `#44608F` | 40.6 | 6.33:1 |
   | High | `#1E2C47` | 18.9 | 13.60:1 |

   L\* gaps of 18.5 and 21.7 — monotone and roughly even. Stated as arithmetic
   rather than as a claim of equal rigour: the screen ramp was validated as a
   set, this one mirrors its reasoning onto a light ground.

2. **The texture channel needed no change, and that is not luck.** It hatches in
   `var(--ink)` — the ground — so it is polarity-correct by construction: dark
   hatching on light fills against a dark page, white hatching on dark fills
   against paper. Do not rewrite it to a literal colour.

3. **The exposure table is forced open.** It lives in a `<details>` that is
   collapsed by default, and it is the view that carries mechanism, confidence,
   as-of date and source count *in words* — which on paper is the view that
   matters most. Both `::details-content` and the
   `details:not([open]) > *:not(summary)` fallback are present on purpose;
   verified to render with real height in Chromium.

4. **Source URLs print.** `a[href^="http"]::after` appends the href. The
   standard published at `/about#method` is that every claim carries a
   followable URL, so a printed page that strips them fails that standard on
   its own terms. `PrintPermalink` does the same job for the page itself, and
   renders **nothing** unless `NEXT_PUBLIC_SITE_URL` is really set — printing
   `http://localhost:3000/...` as a permanent address would be worse than
   printing no address. It carries no "retrieved on" date, because every page
   here is static and the only date available at render is the build's.

Screen-only chrome is hidden with Tailwind's `print:` variant at the component
that owns it — the header, the footer's link lists, the adjacent-issue nav —
rather than by selector in `globals.css`, which stays about tokens.

**The disclaimer appearing both beside the content and in the footer on a
printed page is deliberate, not a duplication bug.** Repeating a risk notice is
the norm in financial documents, issue pages carry no inline disclaimer of their
own and rely on the footer's, and no CSS can know which pages have both.

Tailwind utility names map onto these: `bg-ink`, `bg-surface`, `bg-surface-2`,
`text-fg`, `text-muted`, `text-link`, `border-hairline`, `border-rule`,
`border-accent`.

## 10. Feed findings

**Not yet established.** No `BEEHIIV_RSS_URL` was supplied, so the four checks the
brief asks for could not be run against the real feed:

1. How many `<item>` elements the feed returns — **unknown**.
2. Whether `content:encoded` carries full post HTML or only a summary — **unknown**.
   The sync script warns per item when a body is missing, so this will be obvious
   on the first real run.
3. The exact format of `<link>` values — **unknown**; slug derivation takes the
   final path segment and falls back to slugifying the title.
4. Whether `<enclosure>` or `media:content` supplies a cover image — **unknown**;
   the script reads `enclosure`, `media:content` and `media:thumbnail`, in that order.

The script was verified end to end against a local feed server reproducing a
Beehiiv-shaped feed (CDATA titles, `content:encoded` bodies, enclosures,
categories, a summary-only item). **Run it against the real feed and record the
four answers here.**

## 11. Environment variables

| Key | Purpose | Required | Read by |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin | No — falls back to `$VERCEL_URL`, then localhost | Site |
| `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL` | Subscribe destination | **Yes, before launch** | Site |
| `NEXT_PUBLIC_BEEHIIV_HOME_URL` | Footer link to the publication | No | Site |
| `NEXT_PUBLIC_BEEHIIV_FEED_URL` | Footer RSS link for readers | No | Site |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public contact address | **Yes, before launch** | Site |
| `CONTENT_SOURCE` | `local` (default) or `fixtures` | No | Site |
| `ACCOUNT_STORE` | `none` (default), `memory` (dev) or `supabase` | No — unset means no accounts | Site |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Only with `ACCOUNT_STORE=supabase` | Site |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key. Public by design — RLS is the guard | Only with `ACCOUNT_STORE=supabase` | Site |
| `SUPABASE_SERVICE_ROLE_KEY` | Deletes from `auth.users`. **Bypasses all RLS — never `NEXT_PUBLIC_`** | Only to delete accounts | **Server only** |
| `NOVUS_ALLOW_INCOMPLETE` | Allows a production build with unanswered inputs | No — **never set on Vercel** | Site |
| `NOVUS_CONTENT_DIR` | Overrides the issue archive directory | No — review tooling only, **never set on Vercel** | Site |
| `NOVUS_DISRUPTIONS_DIR` | Overrides the register directory | No — review tooling only, **never set on Vercel** | Site |
| `AISSTREAM_API_KEY` | Enables the chokepoint vessel counts on `/monitor`. Free at aisstream.io. **Never `NEXT_PUBLIC_`** — the build refuses | No — without it that one panel says "not switched on yet" | **Server only** |
| `FINNHUB_API_KEY` | Share prices on `/monitor`. **A licensing decision first** — free tier is non-commercial. Never `NEXT_PUBLIC_` | No — off by default | **Server only** |
| `BEEHIIV_RSS_URL` | The feed to sync from | Only to run the sync | **Sync script only** — not needed on Vercel |

## 12. Commands

```
npm run doctor           where the project stands + the next action (--next, --strict)
npm run new-disruption   scaffold a register entry (--template for a blank file)
npm run review           the register review worklist (--due for what is due)
npm run live:check       read every live feed once, for real (--strict)
npm run check            typecheck + lint + doctor
npm run dev              development server
npm run dev:demo         development server against the sample archive and register
npm run build            production build (strict — fails on unanswered inputs)
npm run typecheck        tsc --noEmit
npm run lint             eslint
npm run sync-issues      pull new issues from Beehiiv
npm run preview          build the single-file review preview
```

The first three are author tooling, added because the information they surface
already existed but needed a dev server and a browser to read. **`doctor` reads
the same `INPUT_LEDGER` the build refuses on**, so the two cannot drift.

**`new-disruption` duplicates the loader's validation on purpose**, because the
register's strictness fails *silently on the page* — an exposure missing one of
its four required fields simply does not render. If
`src/lib/disruptions/sources/local-files.ts` ever changes what it enforces,
change `scripts/new-disruption.ts` in the same commit. A scaffolder that writes
files the loader rejects is worse than no scaffolder. What can be shared rather
than mirrored already is: the id rule (`ID_PATTERN`) and the lists of statuses,
categories, severities and confidences are imported from
`src/lib/disruptions/types.ts`, and `doctor`, `review` and the site all measure
an entry's age with the one `daysSince()` there.

The drift can run the other way too, and did: `isIsoDate()` in `scripts/lib/cli.ts`
was already strict about `YYYY-MM-DD` while the loader accepted anything
`new Date()` could read. A scaffolded entry was therefore always fine and a
**hand-edited** one was not — and hand-editing `updatedAt` is exactly what
every review does. The loader now matches the scaffolder.

**All three of these tools respect `NOVUS_DISRUPTIONS_DIR`.** `new-disruption`
used to hardcode `content/disruptions`, so with the override set in `.env.local`
— which `loadEnvLocal()` reads — a freshly scaffolded entry went into the real
register while `doctor` and `review` read somewhere else, and it appeared to
have vanished.

## 13. Out of scope for this repository

Do not build, scaffold or stub: gated content; payments or paid
tiers; a CMS or admin interface; self-hosted email or subscriber
management; **live market-data APIs or price feeds**; search, tag filtering or
comments; analytics or tracking; a test framework; a custom email capture form;
MDX tooling; a scheduled sync workflow; a mobile app, a
native client or push notifications; a dark/light mode toggle.

### Amended by the author: accounts, and the backend they need

This section used to forbid "a database... or any backend endpoint" outright,
and the site was purely static. The author asked for sign-in to be built, so
that is now **narrowly** permitted, on these terms:

- **The reading site stays static.** The register, the exposure chart, the
  entity pages, the briefings, the home page and the feed are all still
  prerendered and ship no session-dependent markup. `/monitor` and
  `/live.json` are the one exception to "static", and a narrow one: they are
  prerendered too, then regenerated on the server every fifteen minutes (ISR,
  §6d). They read no session and are identical for every reader. Only `/account` and
  `/auth/*` are dynamic, and they are dynamic because they await `cookies()`.
  **If a static page ever starts reading the session, that is a regression** —
  the home page's signed-in state is resolved client-side after mount
  specifically to avoid it.
- **No data is stored in this repository.** Supabase holds the rows. §6b rule 2
  is unchanged and is not negotiable.
- **The alerting service is still out of scope here.** The watcher that polls
  `/register.json`, decides who to notify and sends is a separate service, for
  the reason in §14.2: it is the component that has to stay up, and merging it
  into the publication makes every notification change a deploy of the website.

What this amendment does **not** license: gated content (nothing on this site is
withheld from signed-out readers), payments, an admin interface, or storing
anything about a reader beyond what `/privacy` enumerates.

**`/privacy` was rewritten in the same change**, as §14.2 required — not
afterwards. It now lists exactly what an account holds, and it describes the
un-configured deployment accurately too.

**The sign-in panel.** `src/components/sign-in-panel.tsx` is now real when
`ACCOUNT_STORE=supabase`, and keeps its honest pre-launch behaviour otherwise —
it sends nothing and says so, before and after a submit attempt, so a
deployment without a Supabase project still cannot mislead anyone. The password
field is **gone in both states**, because sign-in is a magic link and no
password exists to collect.

**Superseded:** an earlier version of this file said "no dashboards or charts,
this is not a data product yet". That is no longer true — the register and the
exposure chart *are* the product. What remains out of scope is **live market
data**: a price, a rate or an index pulled from a feed and shown as current. The
site publishes assessments with an as-of date, not a ticker.

**Amended by the author: live physical-world readings are in scope.** The
author asked for "updates and close to real time data". `/monitor` now reads
public feeds — vessel positions, reporting against normal, natural hazards, weather —
every fifteen minutes. That is deliberately *not* the market data forbidden
above: none of it is a price, a rate or an index, and none of it is presented
as an assessment. Every reading carries its source's own timestamp (§6d).
Adding a price or freight-rate feed is still a separate decision to ask about,
because being wrong about a price costs more than being late about a storm.

**Amended again by the author: energy and share prices.** Asked "can I get
stock and crude oil prices", the author took both. Energy prices shipped: they
are public-domain U.S. government series (EIA, Federal Reserve Board) via
FRED, daily settlements shown with their observation date — an as-of value,
not a ticker. Share prices are built but **off by default**, because no free
provider licenses public display; switching them on is the author's licensing
call (DEPLOY.md Part 6). Freight rates remain out: every index worth showing
is commercially licensed.

The alerts app is a real, stated direction — the seam is documented in §14.2 and
nothing here forecloses it. It is still out of scope for *this repository*,
because its state is per-user and mutable and this repo is a static site.

**Vercel's Hobby tier is non-commercial-use only.** The site as specified — free
newsletter, no transactions — is compliant. Paid subscriptions or ads would
require a Pro plan.

If a task appears to need any of the above, stop and ask.

## 14. Phase 2 seams

Documented intent. **None of this is coded, and none of it should be coded until
issues are publishing on a schedule.** The point of writing it down now is that
two decisions in v1 were made to keep these doors open, and a later change that
closes them would be expensive to undo.

### 14.1 The indicators layer

**Partly built — see §6d.** `src/lib/live/` is this layer for physical-world
readings (vessels, reporting, hazards, weather, energy prices), and it answers the three
questions below: every reading has a source, an as-of timestamp taken from
the data, and a defined stale behaviour. What remains unbuilt is the part
this section worried about most — prices and freight rates — and that stays
a separate decision.

The register layer in `src/lib/disruptions/` is the first instance of this
pattern and proves it works. When *live indicator data* arrives — a freight
rate, a transit count, a price — it becomes a **third** typed layer at
`src/lib/indicators/`, built the same way. It must **not** be bolted onto either
existing layer: a document, a tracked assessment and a time series have
different shapes, different refresh characteristics and different failure modes.

Every indicator needs three things decided before the first one is drawn: a
**source**, an **as-of timestamp**, and a **defined behaviour when stale**. A
publication about supply chain disruption that shows last week's freight rate as
though it were today's would destroy more credibility than this whole site
builds.

### 14.2 An app with notifications

The stated direction is a Novus Data app that notifies readers. The site is
already shaped for it; keep it that way.

**What v1 already provides.** Notifications need stable identity and honest
timestamps, and the archive has both by design:

- `slug` is permanent and unique — enforced, not merely intended. It is a usable
  notification key, and one that already matches a public URL.
- `publishedAt` is ISO 8601 and is **never** substituted with today's date when
  missing. A notification pipeline can trust it or see that it is absent.
- `issueNumber` may be `null` and is never derived from position, so nothing
  renumbers under a client that has already stored an id.
- The content layer is a typed boundary, so a second consumer — an app's API —
  reads issues through the same contract rather than reaching into files.

**The machine-readable feed — now built, and not of the issues.** This said to
build `feed.json` from `listIssues()`. That was the wrong feed: alerts do not
fire on newsletters. `src/app/register.json/route.ts` emits the **register**
instead, which is the actual trigger source, and §6c records why its items are
state rather than events. An issues feed was later built as
`/feed.json` — every post, briefings, articles and reviews, summaries only —
because the app prototype's Read screen needed a real list rather than an
invented one. `/live.json` is the third seam: live flags, diffed the same way.

**Where the app's state must NOT live.** Device tokens, per-reader preferences,
delivery logs and read receipts are mutable, per-user, privacy-bearing data. This
repository is a statically generated site with no database and no backend
endpoint, and that is a large part of why it is fast, cheap, auditable and
honest about collecting nothing (see `/privacy`). Do not add a database, an API
route that writes, or a subscriber table here.

The shape that keeps both halves simple:

```
this repo (static)            separate service              clients
  content/issues/  ──►  feed  ──►  watcher + registry  ──►  push / app
  (archive of record)             (tokens, prefs, log)
```

The service polls or is webhooked by the feed, owns the subscriber registry, and
sends. The site stays a publication. If the two are ever merged, every future
change to notification logic becomes a change to the thing that has to stay up.

**Two consequences worth knowing before starting.** Push notifications put a
name and a device identifier into a system that currently stores nothing — so
`/privacy` stops being accurate the moment that ships, and it must be rewritten
in the same change, not afterwards. And a notification is a far stronger claim on
attention than an email: an alert that turns out to be stale or wrong costs more
trust than the same error in an issue nobody was interrupted for. Alerting on
indicators (14.1) should therefore come **after** the indicators themselves have
been running visibly and correctly for a while.

### 14.3 Smaller deferred items

A scheduled GitHub Action could run `sync-issues` automatically.

**The CSP is now shipped, in report-only mode**, ahead of the cutover this
section originally waited for. The reasoning changed rather than the caution:
a report-only policy blocks nothing, so it is the tool for discovering the
unknown newsletter-CDN host rather than a guess that could break the site.
`next.config.ts` carries the policy and the two deliberate loosenings —
`script-src 'unsafe-inline'`, because a nonce would force every page dynamic
and break the static-rendering rule in §13, and an `img-src` with no CDN host,
which is the thing the report-only run exists to find out. Switch to the
enforcing header once the reports are quiet against real traffic. Analytics, search and tag filtering are
listed with their reasons in `HANDOFF.md`. None is coded.

## 14a. The published standard of proof

`/about#method` states, in public, exactly what an assessment must carry to
appear on the exposure chart, what each confidence level means, how the severity
scale is defined, and when an entry is treated as too old. `/about#corrections`
states how mistakes are handled.

This is not marketing copy. It is the checkable version of the claim the site
makes about itself, and it is the first thing a sceptical analyst will look for.
If the enforcement in `sources/local-files.ts` ever changes, **change this page
in the same commit** — a published standard the code does not actually enforce
is worse than no published standard.

### The scripts may import from `src/`, and the reverse is still forbidden

`no-restricted-imports` stops `src/` reaching into `scripts/`, because that
would give the website a runtime dependency on a build tool. The other direction
is fine and is how `doctor` and `review` stay honest: they read the real ledger
and the real register loader rather than a second copy of the rules. `tsx`
resolves the `@/*` alias from `tsconfig.json`, so scripts import exactly the way
the site does.

Two mechanical notes for anyone editing them. `tsx` compiles these files as
CommonJS, so **there is no top-level await** — each script wraps its work in
`main()`. And `.env.local` must be loaded *before* any module that captures an
environment variable at load time (`DISRUPTIONS_DIRECTORY` does), which is why
the site modules are pulled in with dynamic `import()` inside `main()` rather
than static imports that would hoist above the call.

## 15. Open questions and TODOs

Tracked in `HANDOFF.md`, which is the live list. In short: verifiable bio facts,
a project contact address (a temporary one is in use), the Beehiiv RSS feed URL,
the publishing cadence, the real logo file, and confirmation of the drafted topic
list and methodology statement.

Launch decisions made so far, and the ones still open, are in @DECISIONS.md.
Read it before proposing a new section, a new kind of data, or anything
involving money.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
