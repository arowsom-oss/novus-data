# Decisions

What has been decided about getting Novus Data live, and what is still open.
When a decision changes, change it here in the same pull request that acts on
it, so this file never describes a plan nobody is following.

People are named by GitHub account: `arowsom-oss` builds the website,
`Novous-Data` does the research.

## How decisions get made

Proposed by `arowsom-oss` on 2026-09-23. **`Novous-Data` has not agreed yet.**
When that happens, replace this line with the date both agreed.

- **The website's pages and code** are `arowsom-oss`'s call.
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

## Where the repository lives

Done by `Novous-Data` on 2026-09-23: the repository moved into the free
organisation `novus-data`, which also fixes the "Novous" spelling. The address
is now `github.com/novus-data/novus-data`, and the old one redirects.

When this was written, `arowsom-oss` still had write access only. Becoming an
owner takes two steps: `arowsom-oss` accepts the organisation's invite, then
`Novous-Data` changes the role to Owner.

## Still open

1. What goes live on launch day: the main branch as it is, or the main branch
   plus the fixes from pull request #9 (the new font, the print fix and the
   register bug fixes)?
2. Whether the site makes money, and how. If yes, work through the checklist
   below first.
3. Whose account the site is hosted from.
4. Who the editor is, the first name on the masthead.
5. The minimum content needed before launch.
6. How often the briefing goes out.
7. The launch date.

## Before the site makes money

Recorded on 2026-09-23 as a reminder. None of this is needed while the site is
free, and it is a list of things to check, not legal advice. "Makes money"
means anything: paid subscriptions, ads, sponsorships or selling something.

- [ ] **Both of you agree.** Money is a big change under the rule above.
- [ ] **Move Vercel from Hobby to Pro.** Hobby is for non-commercial use only,
      so a site that earns money breaks its terms.
- [ ] **Check each service's age rules**: Vercel, Beehiiv, and any payment
      provider. Many require account holders to be 18. If one of you isn't, a
      parent may need to own the account.
- [ ] **Refund policy page**, if anything is sold, such as paid subscriptions.
      Ads alone don't need one.
- [ ] **Terms and conditions page.** Also worth adding as soon as reader
      sign-in goes live, because an account is an agreement with the reader.
- [ ] **Cookie consent banner, only if ads or analytics arrive.** Today the
      site sets no cookie unless someone signs in, and a login cookie needs no
      banner. Ad networks almost always add tracking cookies, and those do.
      Rewrite `/privacy` in the same change.
- [ ] **A postal address in the newsletter.** Once the newsletter carries ads
      or sells something, US anti-spam law (CAN-SPAM) expects a physical postal
      address in every email. Use a PO box or mailbox service, never a home
      address. Check whether Beehiiv asks for one sooner.
- [ ] **Taxes.** Money earned may need reporting, and some places require a
      registered business. Check the rules where you live.
- [ ] **Business details on the site**: the name and contact email at minimum.
      Still no home address.
