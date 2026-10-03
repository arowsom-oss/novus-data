# CLAUDE.md — Novus Data website

Working notes for anyone (human or agent) picking this repository up. Read this
before changing anything.

## 1. What this project is

**Novus Data is an information and financial-news site about supply chain
disruption.** It does three things, in this order of importance:

1. **The register** (`/disruptions`) — what is going wrong in physical trade
   right now, each entry dated, sourced and given a status.
2. **The exposure chart** (`/exposure`) — which companies and sectors each
   problem reaches, and by what mechanism.
3. **The briefing** (`/briefings`) — an email newsletter summarising movement in
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

**This rule got stronger, not weaker, when the site became a data product.** The
register and the exposure chart do publish claims about named companies — but
only claims that carry a mechanism, a confidence level, a date and a followable
source, enforced in code (§6a). Sourced is not the same as invented. Nothing
else on the site may state a figure at all.

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
scripts/lib/cli.ts         Shared colour, prompting and .env.local reading.
src/config/                Every fact the site states, and the navigation.
  publication.ts             The facts. Pure data, no side effects, safe anywhere.
  input-ledger.ts            Where each fact came from + the launch guard. SERVER ONLY.
  coverage.ts                The tracked topics. Home and /coverage both read it.
  nav.ts                     Header, footer and sitemap routes.
src/lib/content/           The issue content layer. See section 6.
src/lib/disruptions/       The register and exposure layer. See section 6a.
src/lib/accounts/          The account contract and its Supabase store. See 6b.
src/lib/supabase/          Supabase clients. admin.ts is SERVER ONLY. See 6b.
src/lib/env.ts             Environment access and URL resolution.
src/lib/format.ts          Dates, issue numbers, reading time.
src/lib/og.ts              Font data and colours for generated images.
src/lib/structured-data.ts JSON-LD builders.
src/components/            Presentational components. One client component.
src/app/account/           The signed-in page and its server actions. Dynamic.
src/app/auth/              Magic-link callback and sign-out. Dynamic.
src/proxy.ts               Session refresh. NOT middleware.ts — renamed in Next 16.
src/app/entities/          Company and sector pages, derived from the register. See 6c.
src/app/register.json/     JSON Feed of the register — the alerting seam. See 6c.
src/app/                   Routes, metadata routes, icons, error boundaries.
src/assets/fonts/          Newsreader TTFs, for icon and social card rendering.
                           Static cuts from the variable source — see src/lib/og.ts.
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
visually-hidden text and take keyboard focus. A canvas or SVG chart library
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

### Typography — amended by the author

The palette above is unchanged. The **typefaces and the type scale were
replaced** on the author's instruction: the site was reading as generated
rather than as a publication, and the brief is a classic financial paper.

| Role | Was | Now |
|---|---|---|
| Editorial — headlines, ledes, summaries, issue bodies | Source Serif 4 | **Newsreader** |
| Interface — navigation, labels, metadata, buttons | Inter | **Libre Franklin** |

Three things about this, all of which are load-bearing:

1. **The serif/sans split is a division of labour, not decoration.** On a news
   page the serif is what you *read* and the sans is what you *operate*. So
   `p`, `li`, `blockquote`, `figcaption` and `dd` take the serif in
   `@layer base`; navigation, buttons, labels, table headers and `.text-meta`
   take the sans back. **A publication that sets its body copy in a UI sans
   reads as a web app about finance rather than as a financial publication** —
   that single choice was the loudest tell.
2. **Inter is the AI-default sans.** It is the face a generated page reaches
   for. Reintroducing it undoes the point of this change.
3. **The scale was pulled down, not just re-lettered.** The old top end
   (`4.125rem` display, `2.75rem` title) is landing-page scale; it made an
   index page shout. A broadsheet reserves its largest size for the lead story
   and sets everything else close to the text. Display now tops out at
   `3.25rem` and title at `2.125rem`, with looser tracking because Newsreader
   is drawn more openly than the old face and over-tightened at the old values.

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

### The story box — amended by the author (29 September 2026)

The author's brief: the site "looks too vibe coded", and text should sit on a
backing, in a boxed-article format. So **text no longer floats on `--ink`.**
Every block of reading text sits in a story box, `StoryBox` in
`src/components/story-box.tsx`, styled by `.story` in `globals.css`:

- **One grammar:** kicker, headline, optional deck, body, footer, in that
  order. Links, dates and counts go in the footer, where a paper puts a
  story's dateline. `story-lead` is the heavier-ruled main story;
  `story-compact` is a rail or list box.
- **Square corners, no shadow, a 2px `--accent` top rule** (4px on the lead)
  and a `--border-strong` frame. A rounded card with a drop shadow is the
  default component of a generated page; a ruled box is what a newspaper
  uses. Do not round it or add a shadow in a polish pass.
- **`.story` is in `@layer components` on purpose**, so a utility at the call
  site (a column span, `gap-0`) still wins. This is the opposite of
  `.prose-novus`, and for the opposite reason: nothing needs to beat `.story`.
- **The home page is a front page, not a landing page.** A nameplate (the
  page's `h1`, closed by a double rule), a lead story with a rail beside it,
  then labelled bands of boxes (`SectionLabel`). The lead is chosen, never
  written: the top open register entry, else the latest briefing, else the
  case for the site. The hero, the two call-to-action buttons, "What we do",
  the four equal pillars and the decorative grid-line backdrop (`.grid-field`)
  were the template tells and are gone. Do not bring back a hero.
- **Lists stay one object.** The briefing archive is one box with hairlines
  between issues (a sequence reads as aligned columns); the register is one
  box per entry (each entry is a story).
- `ActionLink`'s primary variant sits on `--surface-2` so it still reads as a
  control inside a `--surface` box.
- **Print:** surfaces already collapse to white, so a box prints as a grey
  frame with its accent top rule. Compact boxes do not split across pages.

Tailwind utility names map onto these: `bg-ink`, `bg-surface`, `bg-surface-2`,
`text-fg`, `text-muted`, `text-link`, `border-hairline`, `border-rule`,
`border-accent`.

## 10. Feed findings

**Checked on 3 October 2026.** The publication's public feed,
`https://rss.beehiiv.com/feeds/q2HQCm9T6z.xml`, returns HTTP 200 and a valid RSS
channel, but no published issues. The remaining checks require the first issue:

1. How many `<item>` elements the feed returns — **0 at this check**.
2. Whether `content:encoded` carries full post HTML or only a summary — **unknown**.
   Run `npm run sync-issues -- --dry-run` after the first issue is published.
   The sync reports `has no content:encoded body` and exits nonzero before any
   writes if a pending issue has no usable body; it never substitutes a summary.
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
| `BEEHIIV_RSS_URL` | The feed to sync from | Only to run the sync | **Sync script only** — not needed on Vercel |

## 12. Commands

```
npm run doctor           where the project stands + the next action (--next, --strict)
npm run new-disruption   scaffold a register entry (--template for a blank file)
npm run review           the register review worklist (--due for what is due)
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
files the loader rejects is worse than no scaffolder.

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
  prerendered and ship no session-dependent markup. Only `/account` and
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
state rather than events. An issues feed remains a reasonable reading
convenience and is still unbuilt; it is not a prerequisite for the app.

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
the contact address, the three Beehiiv URLs, the publishing
cadence, the real logo file, and confirmation of the drafted topic list and
methodology statement.

Launch decisions made so far, and the ones still open, are in @DECISIONS.md.
Read it before proposing a new section, a new kind of data, or anything
involving money.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
