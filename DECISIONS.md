# Decisions

What has been decided about getting Novus Data live, and what is still open.
When a decision changes, change it here in the same pull request that acts on
it, so this file never describes a plan nobody is following.

People are named by GitHub account: `arowsom-oss` builds the website,
`Novous-Data` does the research.

## How decisions get made

Proposed by `arowsom-oss` on 2026-09-23. **Agreed by `Novous-Data` on
2026-09-24**, who widened the first rule: in his words, Alex "can do whatever
he wants" with the code, and the code is his too.

- **The website's pages and code** are `arowsom-oss`'s call, without needing
  to ask.
- **What the register claims about companies** is `Novous-Data`'s call. It is
  the research.
- **A big change needs both.** A big change is a new section, a new kind of
  data, or anything involving money. If both don't agree, it doesn't ship.

Why not "whoever builds it decides": Claude writes most of the code in this
repository, so that rule would really mean "whoever asks Claude first".
Ownership follows who is responsible for a thing being right, not who typed the
request.

## Launch

Decided by `arowsom-oss` on 2026-09-23, under the rule above. A big change
ships only when both agree, so one "not yet" is enough to hold it back.

- **The live monitor and prices are not in the launch.** They can be added
  afterwards, if both agree then.
- **Articles are not in the launch.** The section goes live once `Novous-Data`
  has finished an article, so it never opens empty.

## The editor

Decided by `Novous-Data` on 2026-09-24: **Gavin McGreevy** is the editor, the
first name on the masthead and the byline of record. It is set in
`src/config/publication.ts`, and a production build no longer stops for it.

## Where the repository lives

Done by `Novous-Data` on 2026-09-23: the repository moved into the free
organisation `novus-data`, which also fixes the "Novous" spelling. The address
is now `github.com/novus-data/novus-data`, and the old one redirects.

When this was written, `arowsom-oss` still had write access only, as an
outside collaborator. Becoming an owner: `Novous-Data` invites `arowsom-oss`
to the organisation with the role **Owner**, and he accepts (DEPLOY.md Part 7,
step 3).

## Still open

1. What goes live on launch day: the main branch as it is, or the main branch
   plus the fixes from pull request #9 (the new font, the print fix and the
   register bug fixes)? Code, so `arowsom-oss`'s call under the rule above.
2. Whether the site makes money, and how.
3. Whose account the site is hosted from.
4. The minimum content needed before launch.
5. How often the briefing goes out.
6. The launch date.
