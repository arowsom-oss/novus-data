# HANDOFF.md — Novus Data website

State of the build, what is unresolved, and what I decided when the brief did not
decide for me. Written to be read once, in order.

---

## 0. The brief changed after the first build

The original brief described an information page for a newsletter. That was
wrong about what this project is, and it was corrected: **Novus Data is an
information and financial-news site about supply chain disruption.** The
newsletter is one part of it.

What that changed:

| Before | Now |
|---|---|
| Home led with the latest newsletter issue | Home leads with the most pressing open disruption, like a news front page |
| Five routes, newsletter-shaped | `/disruptions`, `/exposure`, `/briefings`, `/alerts`, `/about` and more |
| "Not a data product. No dashboards or charts." | The register and the exposure chart **are** the product |
| Newsletter was the whole site | Newsletter is a named sub-product, `The Novus Data Briefing` |
| Nothing about an app | `/alerts` describes the planned app, in the future tense, with no fake waiting list |

The one thing that did **not** loosen is the rule against unsupported claims —
see 4.12. It got stricter, because the site now names companies.

## 1. Read these three things first

1. **Nothing on this site states a fact you did not supply.** Section 0 of the
   brief arrived entirely unfilled, so rather than inventing a bio, a subscriber
   count or a publishing schedule, every fact is centralised in
   `src/config/publication.ts` with a ledger recording where it came from. Facts
   never supplied are `null` and the site renders around their absence. Start at
   `INPUT_LEDGER` in that file — it is the to-do list. (Section 3 below.)

2. **A production build fails on purpose right now.** The editor's name is
   confirmed. The Beehiiv account has not been created yet, so the subscribe
   URL remains unavailable; the public contact address is also unset.
   `npm run build` names both missing inputs. That is deliberate:
   a subscribe button that goes nowhere defeats the point of the site. (Section 4.)

3. **`/privacy` is yours to check.** It describes how the site actually behaves
   and is deliberately not drafted as a legal policy. Read it line by line before
   the domain goes live. `src/app/privacy/page.tsx:16` carries the TODO.
   (Section 8.)

---

## 2. What was built

All twelve milestones of the brief, plus a review preview that was not in it.

| Milestone | State |
|---|---|
| 0 Preflight and design plan | Done. Directory was not empty — see 4.3 |
| 1 Scaffold, docs, env | Done |
| 2 Design tokens, fonts, wordmark, icons | Done |
| 3 Content layer, `/debug/content` | Done |
| 4 Sync script | Written and tested; **never run against the real feed** — no URL supplied |
| 5 Site shell, 404, error boundaries | Done |
| 6 Deployment instructions | `DEPLOY.md`. Not executed — Rule 7 |
| 7 Home page, including pre-launch state | Done |
| 8 Archive and issue pages | Done |
| 9 Editorial and information pages | Done |
| — Reposition as a news and information site | Done — see 0 |
| — Disruption register (`/disruptions`) | Done. Register ships empty; see 4.12 |
| — Exposure chart (`/exposure`) | Done. Validated ordinal ramp, table view, mobile list |
| — Alerts page (`/alerts`) | Done. Future tense throughout; no waiting-list form |
| — Home page rebuilt around sign-in + marketing | Done. See 4.15–4.17 |
| 10 Metadata, OG images, sitemap, robots, JSON-LD, headers | Done |
| 11 Accessibility, performance, responsive | Done and measured — see 7 |
| 12 README and handoff | This file, plus `README.md`, `CLAUDE.md`, `DEPLOY.md` |

**Versions installed:** Next.js **16.3.4**, React **19.2.8**, React DOM 19.2.8,
Tailwind CSS **4.3.3**, TypeScript 5.9.3, Node 22.22.2 (`.nvmrc` pins 22).

`create-next-app` pinned `next@16.3.5`, which the npm registry does not serve —
`latest` is 16.3.4. Corrected to 16.3.4 before installing.

---

## 3. Every unresolved input

These are the questions I could not answer for you. They are also encoded in
`INPUT_LEDGER` (`src/config/input-ledger.ts:43`), which drives `/debug/content`
and the review preview's panel, so this list cannot silently go stale.

### Blocks a production build

The editor's name is supplied: **Gavin McGreevy**, confirmed 24 September
2026. Two inputs remain.

| Input | Where | What I need |
|---|---|---|
| Subscribe URL | `NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL` | Create the Beehiiv account and publication, then supply its real subscribe page |
| Contact email | `NEXT_PUBLIC_CONTACT_EMAIL` | The address you are content to publish |

### Drafted by me — confirm or rewrite

| Input | Where | Note |
|---|---|---|
| One-sentence description | `publication.ts` → `description` | Appears in search results and on every shared link |
| Short description | `publication.ts` → `shortDescription` | Footer only |
| Positioning paragraph | `publication.ts` → `positioning` | Rewrite if it does not sound like you |
| Primary and secondary readers | `publication.ts` → `primaryReader`, `secondaryReaders` | `/coverage` explains every topic to these readers specifically, so changing them changes that page |
| Methodology | `publication.ts` → `methodology` | **Three paragraphs claiming how the work is done. Read them line by line — if any is not true yet, cut it** |
| The seven tracked topics | `src/config/coverage.ts` | Drafted from your description of the project. Cut, reorder or rewrite freely |

### Never supplied — the site omits the claim entirely

| Input | Consequence today |
|---|---|
| Author bio facts (`author.credentials`) | `/about` states nothing about you beyond your name |
| Publishing cadence (`cadence`) | Subscribe blocks say "Delivered by email. Free." and claim **no schedule**. Set it only once you are actually keeping one |
| First issue date (`firstIssueDate`) | The pre-launch hero announces no date |
| `NEXT_PUBLIC_BEEHIIV_HOME_URL`, `NEXT_PUBLIC_BEEHIIV_FEED_URL` | Those footer links do not render |
| `NEXT_PUBLIC_SITE_URL` | Falls back to `$VERCEL_URL`, then localhost. Set it at domain cutover |
| `BEEHIIV_RSS_URL` | **The archive is empty and the feed was never inspected.** See 6 |
| Logo file | Wordmark and icons are set typographically. See 4.4 |
| Three visual reference sites | Design follows the brand spec and the editorial references named in the brief |

### One decision I did not make for you

**Author age and student status.** The brief's default is not to mention age,
school, grade or student status anywhere, and Section 0 was blank, so
`discloseStudentStatus` is `false` and nothing on the site mentions or implies it.
The brief is explicit that this is your strategic decision, not mine. Flag it if
you want it changed; I have not routed around it.

---

### 4.20 Entity pages exist because a watchlist needs something to watch

`/entities/[id]` was added before any signed-in experience, on purpose. A
watchlist holds ids; `Watchlist.entityIds` in the account contract already
declared that, but there was no URL those ids pointed at — an entity existed
only as a row anchor on the chart (`/exposure#entity-<id>`). An anchor is not a
page: it cannot be shared, titled, indexed, given a social card, or followed.

It pays twice, which is why it came first. Logged-out, a page per company is the
only surface the site has for somebody searching a company name — that entire
category of search demand had nowhere to land. Logged-in, it becomes the follow
target with no rework.

Three decisions inside it are worth not reversing:

- **No composite risk score.** The page shows the strongest single assessment
  and the count, never a blended number. See CLAUDE.md §6c.
- **Resolved exposures stay on the page**, rather than disappearing when a
  disruption closes.
- **No JSON-LD.** Marking up a company the publication neither owns nor
  represents as a schema.org `Organization` asserts a relationship that does not
  exist.

### 4.21 The feed is of the register, and its items are state rather than events

CLAUDE.md §14.2 originally said to build `feed.json` from `listIssues()` as the
first piece of app work. Built as `/register.json` instead, because a
notification fires when a disruption opens, escalates or is re-reviewed — not
when a newsletter goes out.

Items carry current state and a review date, not an event log, because this
repository has no event history to emit: a register entry is a file holding the
assessment as it stands. A watcher diffs `date_modified` and `_novus.severity`
per `id`. Inventing `opened` / `escalated` transitions would have been a
plausible-looking fabrication of exactly the kind Rule 1 exists to stop.

`_novus.entities` carries entity ids, so a watcher can match a disruption
against a reader's watchlist and link straight to that entity's page. Register →
feed → watchlist → entity page is now a closed loop, with the account layer the
only part still unimplemented.

### 4.22 Accounts were built, and §13 was amended rather than broken

The author asked for sign-in across three messages. §13 forbade "a database...
or any backend endpoint" and Rule 4 forbids installing a database client, so
this could not be done quietly — the rule is amended in place, with its limits
written down, the way Rule 2 was.

The limits that matter: the reading site is still static (only `/account` and
`/auth/*` are dynamic, out of 22 routes); no reader data is in this repository;
and the alerting service is still out of scope here for the §14.2 reason.

Three decisions inside it:

- **Magic links, no password anywhere.** Not in the types, the database, or the
  form. A password that does not exist cannot leak or be reused, and it removes
  reset flows, strength rules and breach response from the project entirely.
  The old shell's password input was deleted, not wired up.
- **Row-level security is the guard, not careful code.** Every table restricts
  rows to `auth.uid()`. That is why the anon key is safe in the browser. It
  also means *not found* and *not permitted* are indistinguishable, which is
  correct: it stops one reader probing for another's account.
- **`/privacy` was rewritten in the same commit**, as §14.2 demanded. It
  enumerates exactly what an account holds and stays accurate on a deployment
  with no account store, because it branches on the real configuration.

### 4.23 The launch guard had to become build-only

`assertLaunchReady()` runs at module load in the root layout. While every route
was static that only ever happened during prerendering. Adding dynamic routes
changed it silently: a dynamic route re-evaluates the layout **per request**, so
a preview built with `NOVUS_ALLOW_INCOMPLETE=1` and served without it answered
static pages happily and returned 500 on `/account` — a confusing way to
discover a missing variable, and a broken deployment rather than a prevented
one.

Now gated on `NEXT_PHASE === 'phase-production-build'`, which is what the
docstring always claimed it did. Verified both ways: a build with missing
inputs still fails with the list, and the served dynamic routes no longer throw.

Found by serving the built site rather than by reading the diff. It would not
have shown up in any static check.

### 4.24 The typography was reset for a financial publication

The author's read was that the site looked generated rather than published, and
asked for something closer to a classic financial paper, keeping the palette.
§9 said the reading surface was settled; it is amended in place rather than
quietly contradicted, the way Rule 2 and §13 were.

The palette did not change at all. What changed:

- **Newsreader for editorial, Libre Franklin for interface.** The split is the
  substance, not the names: on a news page the serif is what you read and the
  sans is what you operate, so `p`/`li`/`blockquote` take the serif in
  `@layer base` and controls take the sans back. Setting body copy in a UI sans
  was the loudest single tell.
- **Inter was specifically the problem.** It is the face a generated page
  reaches for.
- **The scale came down**, not just across — 4.125rem display to 3.25rem. The
  old ceiling is landing-page scale and made index pages shout.
- **Density**, which is the other tell. Roughly a third out of the vertical
  rhythm; the register fits six entries where four fitted.
- **`.kicker` and `.section-rule`** added as real newspaper furniture.

**The generated images had to follow or shared links would have lied.** Social
cards, the favicon and the apple icon render through Satori from committed TTFs
and were still Source Serif, so every shared link would have shown a face the
site no longer uses. See §4.5 for how the replacement statics were produced.

**A stale line survived the first pass**: the CLAUDE.md directory map still
described the committed TTFs as Source Serif after they had been replaced.
Caught on the next review rather than by the build, because a comment cannot
fail a typecheck.

## 4. Judgement calls I had to make

Ordered roughly by how much they would cost to reverse.

### 4.1 I built the site rather than stopping at the unfilled Section 0

The brief says to stop and ask when a Section 0 placeholder is unfilled. Every one
of them was. You asked for the site to be built so you could review it here, so I
built everything that does not depend on those answers — which turned out to be
the whole site — and routed every fact through one config file with `null` for
anything unsupplied. Nothing is invented, and filling the blanks is now an edit to
one file rather than a rebuild.

**Reversible:** trivially. Every unfilled value is one line.

### 4.2 A production build refuses to run with launch-critical facts missing

`assertLaunchReady()` in `src/config/input-ledger.ts:189` throws during a
production build when the author name, subscribe URL or contact address is
missing. `NOVUS_ALLOW_INCOMPLETE=1` bypasses it for review builds and is never set
on Vercel.

The ledger and the guard live in their own module, separate from
`publication.ts`, because **only server code may import them** — see 5.4.
`publication.ts` itself is pure data with no side effects, so it is safe to
import anywhere.

I chose a loud failure over a quiet placeholder because the failure mode it
prevents — publishing an about page with no author — is exactly the thing the
site exists to avoid.

### 4.3 The repository was not empty, and I did not move what was there

`experiments/castrum-maris/` (an unrelated HTML experiment, 160 KB) was already
in the repository. The brief says to stop if the directory contains files. I
scaffolded **alongside** it rather than over it: nothing in `experiments/` was
read, moved or modified, and it is excluded from linting. Next.js and Vercel both
ignore it. Delete it or move it whenever you like; nothing depends on it.

### 4.4 No logo file, so the wordmark is typographic

The brand palette is described in the brief as derived from an existing Novus Data
logo, but the file was not supplied. The brief forbids redrawing or approximating
it, so I did neither. The wordmark is set in Newsreader (`src/components/wordmark.tsx`)
and `icon.tsx` / `apple-icon.tsx` generate the icons from the same treatment.

**When you supply the real logo:** replace `wordmark.tsx`, and replace the two
icon routes with the file. That is the whole change.

### 4.5 Font TTFs are committed to the repository

`src/assets/fonts/` holds two TTFs. The image generator behind the icons and
social cards needs TTF or WOFF, and `next/font` serves WOFF2, so the font data has
to come from somewhere. Committing it also means social card generation does not
depend on a third-party request succeeding mid-build. Both the original Source
Serif 4 and the current Newsreader are SIL Open Font License, so redistribution
inside the repository is permitted.

**Updated when the typography changed (§4.24).** The face is now Newsreader, and
these two files are not shipped by Google — Newsreader publishes no static
instances, and Satori throws on a variable font's `fvar` table. They were cut
from the variable source with fontTools at wght 600/700, opsz pinned to 60. The
method is recorded at the top of `src/lib/og.ts`; regenerate them the same way if
the face is ever updated.

### 4.6 Cover images bypass `next/image`

`src/app/briefings/[slug]/page.tsx:215` disables `@next/next/no-img-element` **for
that one component**, with the reason in a comment. Routing newsletter CDN images
through `next/image` would require a `remotePatterns` allowlist that fails
silently the day Beehiiv changes CDN host. The rule is not disabled anywhere else.

### 4.7 The site has one client component, and it is the navigation, not just the menu toggle

The brief expected the mobile menu toggle to be the only client component. I made
the whole of `SiteNav` a client component instead, because `aria-current` on the
active navigation item needs the pathname, which a server component cannot read.
The cost is a few hundred bytes; the gain is that screen readers announce which
section you are in. Everything else on the site renders on the server.

### 4.8 The archive left-column number is padded, the prose number is not

`0007` in the archive column, where the padding is what makes the numbers form a
true column; plain `Issue 7` anywhere it is read as a sentence. Two formatters,
`formatIssueNumber` and `formatIssueLabel` (`src/lib/format.ts`).

### 4.9 The reading column is 52rem so that the 66ch cap is what actually binds

At the obvious 44rem the container bound first and body copy measured ~56
characters, short of the 66–72 the brand spec calls for. Measured after the
change: **749px ≈ 66 characters at 18px**.

### 4.10 `NOVUS_CONTENT_DIR` exists, and only review tooling uses it

`src/lib/content/sources/local-files.ts:29` lets the archive directory be
overridden. It exists so the review preview can build a second copy of the site
against a throwaway archive of `[SAMPLE]` issues without ever writing them into
the repository. It is not used by `dev`, `build` or any deployment, and it must
not be set on Vercel.

### 4.18 The standard of proof is published, not just claimed

`/about#method` now states in public exactly what an assessment must carry to
appear on the chart, what each confidence level means, how the severity scale is
defined, and when an entry is treated as too old. `/about#corrections` states how
mistakes are handled — including that assessments are withdrawn as readily as
they are published.

This is the single highest-value thing on the site after the chart itself. The
claim "you can trust this" is worth nothing; the claim "here is precisely what we
refuse to publish, and the code enforces it" is checkable. It is also the first
thing a sceptical analyst looks for.

**If the enforcement in `sources/local-files.ts` ever changes, change that page
in the same commit.** A published standard the code does not enforce is worse
than no published standard at all.

### 4.19 Staleness is phrased against the build, not against "now"

Pages are static, so a day count rendered on one freezes at build time and can
only ever understate how old an assessment is — the dangerous direction for a
site whose pitch is knowing when something was last true. The page therefore
shows the absolute review date, which stays true forever, and phrases the warning
as "had not been reviewed when this page was built". `/about` explains why in the
reader's terms.

### 4.15 The home page leads with a sign-in that does nothing — safely

You asked for the account experience to be the first thing on the page, to be
wired up later. It is built as a shell that **cannot mislead anyone**:

- no form `action`, and the submit handler calls `preventDefault` — nothing is
  ever sent anywhere;
- the password is never held in React state, stored, or logged;
- the panel says "Accounts are not open yet" **before** anyone types, and after a
  submit attempt it says "nothing was sent. Nothing you typed left this page";
- `autoComplete` is off on both fields, so no browser offers to save a password
  for a form that does nothing.

That last set of decisions is deliberate rather than fussy. A real-looking login
that silently swallows a password is the one version of this that would be
genuinely harmful, and people reuse passwords. When auth is real, replace the
submit handler and delete the notice in the same change.

### 4.16 The site now speaks as "we", and Rule 2 was amended rather than ignored

The marketing sections you asked for — "what we do at Novus", "why we are
invaluable" — need a company voice, and the original brief's Rule 2 banned the
first person plural outright. Rather than quietly break it, I amended it in
`CLAUDE.md` and recorded why.

The line I held: "we" as the voice of the company is fine and normal. "Our team",
"our analysts", a claimed office or a headcount are still forbidden, because
those assert people who do not exist — which is the thing Rule 2 was actually
protecting against. Editorial pages (`/about`, register entries, briefings) stay
in the first person singular, because those carry a byline.

### 4.17 The app is advertised in the future tense

You asked me to advertise the app. It does not exist, so every sentence about it
says so: "In development", "It is being built now and there is no release date
worth announcing yet". The calls to action are "What the app will do" and "Get
told when it lands", pointing at the briefing — the only channel that actually
exists today.

I would push back hard on changing this before the app ships. The reader this
site is built for is a finance professional deciding whether you are serious, and
an app store link that goes nowhere, or a "download now" for something unbuilt,
costs more credibility than the whole home page earns. The moment there is a
build, the copy changes in one file.

### 4.12 The exposure chart refuses to draw what it cannot source

This is the most important decision in the rebuild, so it is in code rather than
in a style guide.

A chart saying "problem X reaches company Y" on a finance site is a claim someone
may act on. I will not invent one. So `src/lib/disruptions/sources/local-files.ts`
drops any exposure that does not carry **all four** of: a *mechanism* (the
sentence explaining how the problem reaches the company), a *confidence* level,
an *`asOf`* date, and *at least one followable source*. A disruption with no
source at all is skipped entirely. Every refusal prints a warning naming the
file, and `/debug/content` lists them.

There is no way to produce a coloured cell without all four. That constraint is
the product, not an obstacle to it — it is the reason a reader should believe the
chart at all.

Two consequences worth keeping:

- **The register ships empty.** I have not written a single real disruption,
  because I cannot source one for you. The site renders a deliberate empty state.
- **Every company in the fixtures is invented.** Using a real listed company with
  a made-up exposure would read as a sourced claim about a real business — the
  exact harm this design prevents. The fixture names are fictional and obviously
  so.

### 4.13 Severity is a validated ordinal ramp, not a traffic light

Severity is magnitude, so the encoding is a sequential single-hue ramp. It was
run through the palette validator against the site's own background rather than
chosen by eye: monotone lightness, adjacent gaps above the floor, hue spread 3°,
darkest step at 3.06:1. Its middle step is the brand's own `--accent-text`, which
ties the chart into the existing system instead of introducing a second palette.

Red/amber/green was rejected. It reads as a judgement about the company rather
than a measurement of exposure, and it fails for a substantial share of readers
without a second channel. Severity here carries three redundant channels: fill,
visually-hidden text in every cell, and a table view; a texture channel takes
over under `forced-colors`, `prefers-contrast: more` and print. Confidence is a
separate non-colour channel — solid versus dashed cell edges.

### 4.14 No charting library, and the chart is a `<table>`

Every cell is a real element, so it can be a link, hold visually-hidden text and
take keyboard focus. A canvas or SVG chart library loses all three and adds a
client bundle to a page that currently ships no JavaScript. The hover card is
CSS. The matrix is capped at nine columns so it never needs a scroll container,
which would clip those cards; below `lg` it becomes a per-entity list.

### 4.11 The review preview is built from the real build output

Not in the brief; built because you asked to review the site before publishing it.
`scripts/build-preview.ts` runs the real production build twice — once against the
real (empty) archive, once against sample issues — and folds the prerendered pages
into one HTML file with each page rendered in an iframe so the site's own media
queries respond to the frame width. Because the pages come from the actual build,
**the preview cannot drift from the site**; there is no second implementation of
any layout or any line of copy.

---

## 5. Bugs found and fixed during review

Recorded because two of them are the kind that come back.

### 5.1 Issue bodies were rendering almost invisibly

`@tailwindcss/typography` registers `.prose` in Tailwind 4's **utilities** layer.
My `.prose-novus` overrides were in `@layer components`, which the cascade
resolves **first** — so every override lost, and issue bodies rendered at the
plugin's default gray-700 on the navy background. Measured before the fix:
`rgb(55,65,81)` on `#070C20`, about 1.5:1.

Fixed by making the `.prose-novus` rules **unlayered**, which beats a layered
utility. Measured after: `rgb(244,246,250)`, ~17:1, 18px body, 66ch measure.

**This will come back if someone tidies those rules into a layer.** The reason is
commented in `globals.css` and repeated in `CLAUDE.md`.

### 5.2 Outbound links in synced issues lost their `rel` hardening

`sanitize-html` applies `allowedAttributes` **after** `transformTags`, so the
`rel="noopener noreferrer"` and `target="_blank"` the transform added were
stripped again. Fixed by permitting both attributes on `a` as well as setting
them. Verified in the generated file.

### 5.3 Page titles did not share a left edge with their body text

`PageHeader` used the 68rem container while `/about`, `/coverage`, `/subscribe`,
`/contact` and `/privacy` put their body in the 52rem reading container, leaving
the `h1` and the prose on two different left edges. `PageHeader` now takes a
`width` that must match the page body.

### 5.4 The launch guard was running in the browser and crashing the page

Found by the audit, in the last review pass, and the worst of the four.

The readiness check lived at the bottom of `publication.ts` and ran on module
load. When the mobile menu was restructured, the wordmark came with it into the
site's one client component — which pulled `publication.ts`, and therefore the
assertion, into the browser bundle. `NOVUS_ALLOW_INCOMPLETE` is not a
`NEXT_PUBLIC_` variable, so it is not inlined for the browser: in the client the
guard saw a production build with the author name missing and **threw during
hydration**, dropping every page into the global error boundary. Lighthouse
showed it as accessibility 83 with no `<title>`, no `<main>` and no landmarks.

Fixed by splitting the module. `src/config/publication.ts` is now pure data,
safe to import anywhere. `src/config/input-ledger.ts` holds the ledger and the
guard, is imported for its side effect by the root layout alone, and additionally
returns early when `typeof window !== 'undefined'`.

**The general lesson, worth keeping:** a config module that throws on import is a
hazard, because you cannot see from the import site that it has a side effect. If
another build-time assertion is ever needed, put it in a module whose name says
so and keep it out of the client tree.

### 5.5 Tap targets below 44px

Footer navigation (19px), header navigation (41px), the 404 link list (20px), the
`/coverage` contents list and the previous/next issue links (30px) were all under
the brief's 44×44 floor. All now `min-h-11`. Inline links inside prose are left
alone, which is the correct exemption.

### 5.8 Back-end defects found in a dedicated review pass

Seven, found by surveying the data layers rather than by anything failing.

**List pages shipped every register entry's article body.** `listDisruptions()`
returned full entries, so the home page and `/disruptions` each carried the
sanitised analysis HTML of every disruption — content neither page displays. It
now returns summaries; `getDisruption()` is the way to the body. Verified: the
body text appears 0 times on the list page and 1 time on the entry page.

**Register entries had no social card.** Sharing a link to the site's primary
content fell back to the generic site card, telling the recipient nothing about
which disruption they had been sent. Added
`/disruptions/[id]/opengraph-image.tsx`, carrying the title, the status, how
many names are affected and the review date.

**Register entries had no structured data.** The issue pages had `Article`
JSON-LD; the register — the more important content — had none. Added, with
`dateModified` set to the review date and the entry's required citations
included, so a machine consumer can see how current an assessment is.

**A bad `NEXT_PUBLIC_SITE_URL` crashed the build opaquely.** Pasting
`novusdata.com` without a protocol — the obvious thing to type into a Vercel
settings field — threw `Invalid URL` from inside Next's metadata handling, with
nothing naming the variable. It now fails with the key, the value and the fix.

**The register's directory was derived from the issues override.** It resolved
as a sibling of `NOVUS_CONTENT_DIR`, so pointing the issues override anywhere
silently moved the register too. It has its own `NOVUS_DISRUPTIONS_DIR` now, and
the tooling sets both explicitly.

**`CONTENT_SOURCE` meant different things to the two layers.** The issue layer
had a source factory; the register read local files unconditionally, so its
"never in production" fixtures guard never sat in the app's import graph and
could not fire. Added the matching factory. Verified: `CONTENT_SOURCE=fixtures`
now fails the build with both guards reporting.

**Importing a label dragged the filesystem in.** `StatusBadge`, `SeverityLegend`
and the chart imported label constants from the layer index, which pulls in the
`node:fs`-backed source. Nothing is a client component today, so nothing broke —
but the day one of them becomes one, it would have. They import from
`types.ts` now, which is pure data.

Also removed three exported functions and a config field that had lost their
last consumer, and moved `STALE_AFTER_DAYS` to `types.ts` with a note on why the
UI must not print a live-sounding day count.

### 5.7 The home page overflowed at 320px

The subscribe and alerts panels sit in a two-column grid. A grid item defaults to
`min-width: auto` and will not shrink below its longest unbreakable word — and
the unconfigured subscribe note names an environment variable, which is one
33-character token. Fixed with `min-w-0` on the grid children and
`overflow-wrap: anywhere` on the token. Worth remembering: `break-word` does not
affect intrinsic sizing, only `anywhere` and `break-all` do.

### 5.6 The open mobile menu overlaid the headline mid-word

The menu was absolutely positioned and floated over the page, so opening it on
the home page clipped the hero title through the middle of a word — correct
overlay behaviour that nonetheless reads as a rendering fault. The header is not
sticky, so there was nothing to gain from floating it: the panel is now in the
document flow and pushes the page down, which also removed the absolute
positioning and the z-index.

---

## 6. Feed findings — not yet established

The brief asks for four answers about the Beehiiv feed before Milestone 4. No
`BEEHIIV_RSS_URL` was supplied, so **none of them could be answered**, and the
archive is empty as a result.

1. How many `<item>` elements the feed returns — **unknown**.
2. Whether `content:encoded` carries full post HTML or only a summary — **unknown**.
3. The exact format of `<link>` values — **unknown**.
4. Whether `<enclosure>` or `media:content` supplies a cover image — **unknown**.

**This matters more than it looks.** Whatever the sync script writes into
`content/issues/` is what the repository owns permanently. If the feed carries
summaries only, the archive captures summaries only, and the issue pages will
have no body. The script warns per item when a body is missing, so the first real
run answers question 2 immediately.

**A Beehiiv feed exposes only a window of recent items — commonly about twenty.**
Any issue already published is recoverable only while it is still in that window.
If issues exist, run the sync soon.

The script was verified end to end against a local server serving a Beehiiv-shaped
feed — CDATA titles, `content:encoded` bodies, `enclosure` and `media:content`
images, categories, and a deliberately summary-only item. Confirmed: first run
writes; second run skips everything and writes nothing; `--force <slug>` rewrites
exactly one file and keeps its original filename so archive ordering does not
shift; `--dry-run` writes nothing; a fetch failure and an unset URL each print a
readable message and exit non-zero; `<script>`, `<style>`, `<iframe>`, inline
styles, event handlers and `javascript:` URLs are all stripped.

---

## 7. Measured results

Run against a production build served by `next start`, with three sample issues in
the archive. **These are measured numbers, not estimates.**

### Lighthouse

| Page | Form factor | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| `/` | Mobile | **99** | **100** | **100** | **100** |
| `/` | Desktop | **100** | **100** | **100** | **100** |
| `/exposure` | Mobile | **97** | **100** | **100** | **100** |
| `/exposure` | Desktop | **100** | **100** | **100** | **100** |
| `/disruptions/<entry>` | Mobile | **96** | **100** | **100** | **100** |
| `/disruptions/<entry>` | Desktop | **100** | **100** | **100** | **100** |

No failed audits in accessibility, best practices or SEO on any of them — the
exposure chart included.

### Accessibility and layout audit

Across `/`, `/disruptions`, a register entry, `/exposure`, `/briefings`, an issue
page, `/alerts`, `/coverage`, `/about`, `/subscribe`, `/contact`, `/privacy` and
the 404, at 320px, 390px, 1440px and 2560px:

- **Contrast:** zero failures. Every text colour meets or beats its threshold
  against `#070C20`.
- **Structure:** exactly one `<h1>` per page; `header`, `nav`, `main` and `footer`
  present on every page; every image has an `alt`.
- **Keyboard:** the skip link is the first tab stop, with a visible 2px focus ring
  in `#7B92BE`. Tab order is wordmark → navigation → main content.
- **Tap targets:** no standalone control under 44px.
- **Overflow:** no horizontal scrolling at any of the four widths.
- **Hydration:** no React warnings or console errors on any route.
- **Mobile menu:** opens and closes, `aria-expanded` tracks it, the label changes
  to "Close", Escape closes it, navigating closes it and sets `aria-current`.
- **Reduced motion:** transition durations collapse to ~0 under
  `prefers-reduced-motion: reduce`.
- **Wide tables and unbroken strings:** a seven-column table and a 90-character
  unbroken URL scroll or wrap inside their own container at 320px, 390px and
  1440px without the page scrolling sideways.
- **Exposure chart:** severity fills render the validated ramp exactly
  (`#44608F` / `#7B92BE` / `#B4C8EA`), the legend reads in ramp order, confidence
  shows as solid versus dashed edges, and the matrix is replaced by the
  per-entity list below `lg`.
- **The register's refusals work:** entries missing a source, and exposures
  missing a mechanism, a confidence, a date or a source, are dropped with a
  warning naming the file, and the rest of the entry still publishes.

### Behavioural checks

- `/debug/content` returns **404** in a production build.
- An unknown slug returns **404**, not an empty article shell.
- All five security headers present on every route.
- `CONTENT_SOURCE=fixtures npm run build` **fails loudly**, exit 1.
- Four deliberately malformed issue files — no slug, broken YAML, an invalid date,
  a duplicate slug — each produced a warning naming the file; three were skipped,
  the invalid date was kept with the date omitted, and **the build succeeded**.
- An empty archive builds successfully and renders the pre-launch state.
- `grep` for `we`/`our` in `src/`: zero hits in code (Rule 2).
- `grep` for a hardcoded year in `src/`: zero in rendered output. The only matches
  are comments giving date-format examples and the fenced `[SAMPLE]` fixtures.
- `grep` for `lorem`/`placeholder`/`example.com`/`TODO`: one intentional TODO
  (`src/app/privacy/page.tsx:16`) and the fenced fixtures. Nothing else.

### One honest caveat about offline builds

The brief asks that `npm run build` succeed with no network access at all. With a
warm `.next` cache it does — verified with the proxy pointed at a dead port. With
a **cold** cache it does not, because `next/font/google` downloads the font files
during the build:

```
Failed to fetch Inter from Google Fonts.
Failed to fetch Source Serif 4 from Google Fonts.
```

This is a `next/font/google` characteristic, not a content-layer one: **nothing in
the content path touches the network**, which is what the requirement is really
protecting. Vercel builds always have network, so it changes nothing in practice.
If you ever want genuinely hermetic builds, the fix is to switch both faces to
`next/font/local` with the WOFF2 files committed — about twenty minutes, and it
diverges from the brief's instruction to load them via `next/font/google`, which
is why I did not do it unasked.

---

## 8. Placeholders and TODOs in the codebase

The complete list. There is nothing else.

| File and line | What it is |
|---|---|
| `src/app/privacy/page.tsx:16` | **The one intentional TODO.** `/privacy` must be reviewed by you before the domain goes live. It describes real behaviour and is explicitly not a legal policy |
| `src/config/publication.ts:109` | `author.credentials` is empty |
| `src/config/publication.ts:93` | `cadence` is `null`; the site claims no schedule |
| `src/config/publication.ts:96` | `firstIssueDate` is `null` |
| `src/lib/content/sources/fixtures.ts` | The only fabricated content in the repository. Every title is prefixed `[SAMPLE]`, it needs `CONTENT_SOURCE=fixtures`, and it throws if a production build touches it |
| `src/components/wordmark.tsx` | Typographic stand-in until the real logo arrives |
| `next.config.ts` → `redirects()` | Empty by design. Add an entry only if a published slug ever has to change |

---

## 9. Deliberately deferred, with reasons

| Item | Why not now |
|---|---|
| **Content Security Policy** | A CSP that accommodates newsletter CDN images needs testing against real traffic on a real domain. A slightly wrong CSP breaks the site silently, which is worse than not having one. Do it after cutover, in report-only mode first |
| **Analytics** | Excluded on purpose. Adding it changes what `/privacy` has to say, and that page currently says the site collects nothing — which is true. Vercel Analytics is the natural Phase 2 choice; it is not installed |
| **A test framework** | Excluded per the brief. `/debug/content` covers the one place a bug is actually likely — a malformed issue file — at zero dependency cost, and that behaviour is verified above |
| **Scheduled sync** | A GitHub Action could run `sync-issues` on a cron. Not built: the manual step is one command, and a silent automated sync writing a bad file into the archive of record is a worse failure than remembering to type it |
| **The site's own RSS or JSON feed** | Beehiiv is the source of truth today, so the footer links its feed. **This is now the first piece of app work**, not a nice-to-have: it is the trigger source a notification service should watch, and the archive here already has the permanent ids and honest timestamps that needs. See 10 |
| **Beehiiv embedded subscribe form** | `/subscribe` links out rather than embedding. The iframe's styling against a dark background cannot be judged without the real URL. Try it after launch; if it renders badly, the link-out is already correct |
| **Self-hosted fonts** | See the offline caveat in section 7 |

---

## 10. What to tackle next

The shape of the site changed, so the ordering did too.

**1. Put one real disruption in the register.** This now matters more than
anything else, and more than it did when the site was newsletter-shaped. The
register and the exposure chart are the product; with zero entries the site is a
well-built empty frame. One entry — properly sourced, with two or three real
exposures — proves the whole machine and tells you immediately whether the
authoring format is workable in practice. Do this before writing another line of
code.

**Use `npm run new-disruption`.** It prompts every required field and validates
each answer against the rules `sources/local-files.ts` enforces, so you cannot
write a file that silently fails to render. `npm run doctor` then reports
anything that was refused, without needing a dev server.

Expect the first one to be slow. Finding a mechanism you can actually source for
a named company is the hard part, and that difficulty is the point: it is what
the chart is promising the reader.

**2. Answer section 3 of this document.** Half an hour in one config file turns a
site that cannot deploy into one that can.

**3. Decide whether sectors or companies lead.** The model supports both, and the
fixtures use both. Sector-level claims are far easier to source honestly;
company-level claims are far more useful to an investor. My suggestion: start
sector-heavy, add companies only where a filing or a statement supports it, and
let the confidence column carry the difference. A chart that is mostly
`estimated` is not worth publishing.

**4. ~~Emit a machine-readable feed.~~ Done — and it is the register, not the
issues.** `/register.json` ships today as JSON Feed 1.1, statically generated.
It is a feed of the *register* rather than of `listIssues()`, because alerts
fire on a disruption opening, escalating or being re-reviewed, not on a
newsletter going out. Items carry current state rather than events, because
this repository has no event log to emit and inventing transitions would be a
fabrication. `_novus.entityNames` was added later so a notification can name a
company rather than a slug. See CLAUDE.md §6c. An *issues* feed remains a
reasonable reading convenience and is still unbuilt; it is not a prerequisite
for anything.

**5. Then the alerts app — and keep its state out of this repository.** Device
tokens, per-reader preferences and delivery logs are mutable, per-user and
privacy-bearing; this repo is a static site with no database and no write
endpoint. A separate service should watch the feed and own the registry.

Two things easy to discover too late:

- **`/privacy` stops being true the moment push ships.** It currently says the
  site stores nothing, and that is accurate. Rewrite it in the same change.
- **Notify on facts the register can prove first** — a new entry, a status
  change, a company added. Derived alerts (a threshold crossed, a forecast) come
  later, if at all. An alert that turns out to be stale costs more trust than the
  same error inside a written briefing.

**6. Live indicators, last.** When a freight rate or a transit count arrives it
becomes a *third* typed layer at `src/lib/indicators/`, built like the other two
and bolted onto neither. Every indicator needs a source, an as-of timestamp and a
defined behaviour when stale, decided before the first chart is drawn. The moment
the site displays a live number it inherits an obligation to be right about it,
and showing last week's rate as though it were today's would undo more
credibility than the whole site builds.

**7. Smaller things:** a CI workflow (the repo still has none, so nothing
catches a lint or type regression before a deploy — `npm run check` is the
local equivalent and should be run before every push); a CSP in report-only mode
after cutover; analytics only if `/privacy` is updated in the same change; search
or filtering on the register once it passes roughly thirty entries.

---

## 11. Documents that live outside this repository

Four working documents were produced alongside the code and published as
artifacts. They are recorded here because this repository is the durable
record and a chat transcript is not — if the links are lost, so is the
reasoning behind several decisions in CLAUDE.md.

| Document | What it is |
|---|---|
| [Launch runbook](https://claude.ai/artifact/UpGBsRguDZkoBiiijQHQ3X) | Forty-one steps in dependency order from the repository as it stands to a site on its own domain. Tracks progress in the browser. |
| [Novus Data Alerts](https://claude.ai/artifact/Hv12FX3VGddn45vG3CRVRU) | A working prototype of the notifications app plus the full specification: the watcher's diff rules, the privacy consequences, the architecture, and the preconditions for starting it. |
| [Roadmap](https://claude.ai/artifact/2MyTzTcS6w6JZ36qpLtncX) | Twenty-two candidate features rated for growth and revenue, the constraints that decide what is possible, and six things not to build. |
| [Signed-in dashboard](https://claude.ai/artifact/KzpPbKo9prFYY9TMJTk699) | The mockup of the reader's signed-in view. |
| [Handover](https://claude.ai/artifact/J5emiYSmKv2GBSzVyiVgWD) | Bringing a co-author onto the project: what only the owner can click, and an index of the other four. |

**Three decisions recorded there rather than here**, because they are product
rather than code, and each one is load-bearing:

1. **The alerts app is email first, and the client comes later if at all.** The
   watcher plus email is the whole product; an app is packaging. It tests
   demand at no running cost, needs no app store and no 18+ developer account,
   and captures the addresses every revenue option depends on.
2. **Nothing on the roadmap should start before the register has entries.**
   Every item on it multiplies something that is currently zero.
3. **Six features are listed as deliberately not to be built**, the first being
   a composite risk score. It will keep occurring to whoever works on this,
   and it would destroy the site's entire argument — see CLAUDE.md §6c rule 1.

**On working with two people**, `CONTRIBUTING.md` is the file that matters and
it is in this repository rather than an artifact, deliberately: a standard that
lives in a chat transcript is not a standard. The one thing it asks for that
cannot be enforced in code is that the editor has final say on what publishes —
the register's credibility comes from one consistent judgement about what clears
the bar, and that is the only narrow thing. Everything else is open.
