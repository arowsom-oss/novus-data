# Contributing to Novus Data

This is a two-person publication. This file is the part that has to be shared,
because the register's value is that every claim on it was made to the *same*
standard — and a standard only one of us is applying is not a standard.

Read `START-HERE.md` for where things live. Read `CLAUDE.md` for why. This file
is about how we work together.

---

## If you are joining this project

Twenty minutes, in this order. Do not skip step 3 — the site is worth looking at
before you read about it.

```bash
git clone <this repo> && cd novus-data
npm install
npm run doctor      # the state of the project, and the one thing to do next
npm run dev:demo    # the site against sample issues and a sample register
```

1. **`npm run doctor`** reads the same ledger the production build refuses on, so
   it cannot tell you anything the build disagrees with. Whatever it names as the
   next action is genuinely the next action.
2. **Read `CLAUDE.md` §2 and §4** — the two standing constraints and the six
   rules. Those are the whole standard. The rest of that file is reference you
   can look up when you need it.
3. **`npm run dev:demo`** runs against sixteen deliberately awkward sample issues
   and a sample register, because the real content is still thin and most of the
   site's behaviour only appears once there is something in it. Everything you
   see there is `[SAMPLE]`-prefixed and cannot reach production.
4. **Add yourself to the masthead.** `src/config/publication.ts` → `authors`.
   Pick a permanent `id` — every register entry you write will reference it, and
   changing it later silently detaches every assessment you made. Open it as a
   pull request rather than pushing it.
5. **Write a register entry.** `npm run new-disruption` prompts every required
   field and validates each answer against the same rules the loader enforces.

---

## The one rule everything else follows from

> **An assessment that cannot be checked does not render.**

The site enforces this in code, not in editorial habit. An exposure missing any
of these four is silently dropped at load time:

1. **a mechanism** — the sentence saying *how* the problem reaches the company.
   "Affected" is not a finding. "Routes roughly a fifth of its Asia–Europe
   volume through the canal" is.
2. **a confidence** — `reported`, `inferred` or `estimated`.
3. **an `asOf` date** — when the assessment was last true.
4. **at least one source** — a followable http(s) URL and a publisher.

A disruption with no source of its own is skipped entirely.

**Do not relax this to get something onto the chart.** The constraint *is* the
product. It is the reason a sceptical reader has any cause to believe the rest.

---

## Adding a register entry

```bash
npm run new-disruption
```

Use the scaffolder rather than writing the file by hand. It prompts every
required field, validates each answer against the same rules the loader
enforces, shows you the file, and writes it only when you confirm. Hand-written
files fail *silently on the page* — you find out by noticing your entry isn't
there.

Then:

```bash
npm run doctor      # lists anything the site refused or corrected
git add content/disruptions/
git commit -m "register: <what it is>"
git push
```

### What makes a good entry

- **A primary source exists.** A canal or port authority notice, a regulator, a
  customs release, a company's own filing. Trade press is for *finding* stories,
  not settling them.
- **The company is named and defensible.** "Global shipping" is not an exposure.
  A named carrier with a stated route is.
- **It moves on a timescale we can track.** Weekly or monthly. Something that
  moves hourly will always be stale on a static site.

### What gets rejected in review

- An exposure whose mechanism is a restatement of the disruption.
- `reported` confidence where the source is a news article paraphrasing a
  company, rather than the company.
- A severity that the sources do not support. `estimated` exists for a reason —
  use it and say so.
- Any figure not present in a cited source. **Empty is better than invented.**
- A date written any way other than a quoted `"YYYY-MM-DD"`. The loader refuses
  the rest, because looser forms are read differently than they are written.
- An entity whose name, ticker or sector disagrees with how another file already
  describes the same `entity.id`. `npm run doctor` names both files.

---

## Attribution

`publication.authors` in `src/config/publication.ts` is the masthead. The first
entry is the editor. Every author has a permanent `id`.

Register entries carry `author: "<id>"`, and the entry page shows **Recorded
by** once there is more than one of us. That field exists because with two
writers a site-wide byline stops being true, and "who made this call" has to
stay answerable — that is the register's entire claim.

An `id` is permanent once any entry references it. Changing one silently
detaches every assessment that person made.

---

## Review

**One person has final say on what publishes: the editor** (the first entry in
`publication.authors`). This is not about seniority. The register's credibility
comes from one consistent judgement about what clears the bar, and two people
applying "is this mechanism good enough" differently is the main quality risk
this project has.

Everything else is open. Code, tooling, design, the alerts service, the
roadmap — argue for it and make the change.

### Branches and pull requests

- Never commit directly to the default branch.
- Branch, push, open a pull request, and let the other person look at it.
- For register entries specifically: the PR should let the reviewer follow every
  source without leaving the diff. If they can't check it, neither can a reader.

#### Make the first rule real

The line above is currently a promise, not a constraint: either of us can push
straight to the default branch and the other finds out afterwards. That is the
same shape of mistake this project refuses everywhere else — the register's
four-field rule works because `sources/local-files.ts` enforces it, not because
we remember to be careful. The workflow deserves the same treatment.

**This needs a repository admin and cannot be done by an agent** (CLAUDE.md
Rule 7), so it is written here rather than automated. In GitHub:

1. **Settings → Branches → Add branch ruleset**
2. Name it `default-branch`, set **Enforcement status: Active**
3. **Target branches → Add target → Include default branch**
   (choosing the default branch by role rather than by name means the rule
   survives renaming it to `main`)
4. Tick **Require a pull request before merging**
5. Tick **Require status checks to pass**, then search and select **`check`** —
   the workflow in `.github/workflows/check.yml`
6. Leave **Require approvals** at **0** for now. See below.
7. **Create**

**Why approvals start at zero.** Requiring one approval on a two-person project
means neither of us can land anything while the other is asleep or in school.
A rule that blocks work at 11pm is a rule someone disables at 11:05, and a
disabled rule protects nothing. The two boxes above already deliver most of the
value — every change becomes a pull request, and CI must be green before it can
merge. Turn approvals on when the cost of waiting is lower than the cost of a
mistake: realistically, once the register has entries and a bad merge could
publish a wrong assessment.

**What this does not do.** It does not stop a bad change; it stops an *unseen*
one. CI checks types, lint and the input ledger. It cannot tell whether a
mechanism is well-argued or a source says what an entry claims it says. That is
still the editor's job, and no setting replaces it.

---

## Two people, two Claude sessions

We each run our own Claude Code session. There is no shared one, and there is no
way to make one: a conversation belongs to a single account, a shared transcript
is read-only and does not update live, and a Project cannot be shared with
another user at all. **Do not work around that by sharing a login** — an account
carries its owner's connected mail, files and notes, not just this repository.

That matters less than it sounds, because everything a session needs to know is
in this repository rather than in a chat. `CLAUDE.md`, `START-HERE.md` and this
file load automatically when Claude Code opens the repo, so a session started by
either of us begins from the same standard.

One working rule follows from it:

> **A decision that exists only in a Claude conversation does not exist.**

Chats are not shared, not searchable by the other person, and not around in six
months. So when something gets decided, it lands in a file:

| A decision about | Goes in |
|---|---|
| Why the code is shaped the way it is | `CLAUDE.md` |
| How we work, and what is settled | this file |
| What is still unanswered | `HANDOFF.md` |
| Where to change a specific thing | `START-HERE.md` |
| A specific change | the pull request that makes it |

**The shared thread is GitHub, not Claude.** Issues for what needs doing, pull
request review comments for arguing about a change. Those two surfaces do double
duty: they are where we talk, and they are the only part of the conversation the
other person's Claude can actually read.

---

## Before every push

```bash
npm run check
```

Typecheck, lint and doctor in one. If it is clean, the Vercel build will not
fail for a reason you could have caught in ten seconds.

### An optional permissions file for Claude Code

The project's first repository (retired 24 September 2026) carried a
`.claude/settings.json` that this one never had. It is kept here rather than
switched on, because its `ask` rule makes every Claude session — each of
ours — stop and wait for a click before each `git push`, which also pauses a
session that is fixing a failing check. Its `deny` rules are worth having on
their own: they stop Claude reading `.env` files, where the API keys live.
To switch it on, save this as `.claude/settings.json` in a pull request we
both agree to:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm install *)",
      "Bash(npm run build)",
      "Bash(npm run dev)",
      "Bash(npm run lint *)",
      "Bash(npx tsc --noEmit)",
      "Bash(npx create-next-app *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(npx vercel *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(rm -rf *)",
      "Bash(git reset --hard *)"
    ]
  }
}
```

---

## Things that are settled, and why

Changing any of these is a real decision, not a tidy-up. Each has bitten once or
is load-bearing. `CLAUDE.md` has the full reasoning.

| Settled | Why |
|---|---|
| No composite risk score, ever | It would look like data, travel like data, and trace back to nothing — on a site whose whole argument is that it publishes none |
| No predictions or forecasts | Assessments with an as-of date are defensible; a prediction is a bet we did not need to take |
| Severity is never carried by colour alone | Visually-hidden text, a legend, a table view and a texture channel all exist for this |
| `--accent` is structural-only | It fails WCAG AA for text at 3.1:1. Use `--accent-text` for anything read or clicked |
| `.prose-novus` is deliberately unlayered | `@tailwindcss/typography` registers `.prose` in the utilities layer and wins otherwise |
| It is `src/proxy.ts`, not `middleware.ts` | Next 16 renamed it. Every Supabase guide still shows the old name |
| Feed discovery is a `<link>` element | As metadata it renders on zero routes, silently |
| The alerts service lives in a separate repo | It is the component that has to stay up; merging it makes every notification change a deploy of the website |
| Register dates are quoted `"YYYY-MM-DD"` strings | Unquoted, YAML rolls `2026-13-01` forward to `2027-01-01` before anything can check it. Quotes keep the text you wrote |
| One entity id means one company | Two files describing the same id differently used to render one company under two tickers on the same page |

---

## Never

- **Never commit a secret.** `.env.local` is git-ignored. `.env.example` holds
  keys with empty values only. This repository is public and git history is
  permanent.
- **Never add `NEXT_PUBLIC_` to a variable to silence an undefined error.** That
  prefix inlines the value into the browser bundle. `SUPABASE_SERVICE_ROLE_KEY`
  bypasses every row-level security policy.
- **Never put reader data in this repository.** Accounts live in Supabase.
- **Never invent a number, a name, a date or a source.** If a layout wants a
  figure, use a real one or change the layout.
