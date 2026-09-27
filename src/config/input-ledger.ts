/**
 * Where every fact on the site came from, and the check that stops an
 * unfinished site from being deployed.
 *
 * SERVER ONLY. Nothing that runs in the browser may import this module: it
 * asserts at module load, and an assertion that throws during hydration takes
 * the whole page down into the error boundary. The `typeof window` guard below
 * is a second line of defence, not a licence to import it from a client
 * component.
 *
 * It is imported for its side effect by the root layout, which every route
 * renders through, so the check runs once per build.
 */

import { publication } from './publication';

/** How much confidence there is in a given fact. */
export type Provenance =
  /** Supplied by the author. Safe to publish. */
  | 'confirmed'
  /** Drafted from the project description. Needs confirmation before launch. */
  | 'assumed'
  /** Not supplied. The value is `null` and the site omits the claim. */
  | 'unanswered';

export interface InputRecord {
  /** Dotted path into `publication`, or the environment variable name. */
  key: string;
  provenance: Provenance;
  /** Which pages stop being correct if this is wrong. */
  usedOn: string[];
  /** What to do about it. */
  note: string;
  /** A production build fails while this is still unanswered. */
  requiredForLaunch: boolean;
}

/**
 * The state of every input the site depends on. Keep this honest — it is the
 * checklist that decides whether the site is ready to publish, it drives
 * /debug/content in development, and it is the reason no page has to guess.
 */
export const INPUT_LEDGER: InputRecord[] = [
  {
    key: 'publication.description',
    provenance: 'assumed',
    usedOn: ['/', '/about', 'site metadata', 'social cards'],
    note: 'Drafted from the project description. Confirm the wording — it appears in search results and on every shared link.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.positioning',
    provenance: 'assumed',
    usedOn: ['/', '/about'],
    note: 'Drafted. Rewrite in the author’s own words if it does not sound like them.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.newsletter / publication.alerts',
    provenance: 'assumed',
    usedOn: ['/', '/alerts', '/about', 'every subscribe block'],
    note: 'The briefing and the alerts app are named here ("The Novus Data Briefing", "Novus Data Alerts"). Rename them freely — nothing hardcodes either string.',
    requiredForLaunch: false,
  },
  {
    key: 'disruption register (content/disruptions/)',
    provenance: 'unanswered',
    usedOn: ['/', '/disruptions', '/exposure', 'sitemap'],
    note: 'Empty. The register and the exposure chart are the point of the site, and both render a deliberate empty state until the first entry exists. See CLAUDE.md §6a for the file format and the four things every exposure must carry.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.openingLine / openingBody / mission',
    provenance: 'assumed',
    usedOn: ['/', '/about'],
    note: 'The home page headline, the paragraph under it and the mission statement. Written with the creative latitude the author asked for — they describe how supply chains work rather than asserting a sourced fact, so nothing here needs a citation. Rewrite freely; it is the most visible copy on the site.',
    requiredForLaunch: false,
  },
  {
    key: 'sign-in panel (src/components/sign-in-panel.tsx)',
    provenance: 'unanswered',
    usedOn: ['/'],
    note: 'When accounts are disabled, the panel has no form. When accounts are configured, it uses a magic-link sign-in flow. Do not open accounts until the backend and policies are ready.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.methodology',
    provenance: 'assumed',
    usedOn: ['/about'],
    note: 'Drafted. This is a claim about how the work is actually done, so read it line by line and correct anything that is not true yet.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.primaryReader / secondaryReaders',
    provenance: 'assumed',
    usedOn: ['/about', '/coverage'],
    note: 'Drafted from the project description. /coverage explains each topic to these readers specifically, so getting them right changes that page.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.cadence',
    provenance: 'unanswered',
    usedOn: ['/', '/subscribe'],
    note: 'Null. The subscribe blocks currently state no schedule. Set it only once a schedule is genuinely being kept.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.authors',
    provenance: 'confirmed',
    usedOn: ['/about', '/', 'JSON-LD author', 'issue and register bylines'],
    note: 'The masthead. The FIRST entry is the editor and a production build fails while that name is null, because an about page with no author defeats the point of the site. Append a second entry to add a co-author — each needs a permanent `id` that register entries point at.',
    requiredForLaunch: true,
  },
  {
    key: 'publication.authors[].credentials',
    provenance: 'unanswered',
    usedOn: ['/about'],
    note: 'Empty. /about states what is verifiable and nothing more. Add only facts that are true and checkable today.',
    requiredForLaunch: false,
  },
  {
    key: 'publication.discloseStudentStatus',
    provenance: 'confirmed',
    usedOn: ['/about'],
    note: 'False, the documented default. Nothing on the site mentions age, school or student status.',
    requiredForLaunch: false,
  },
  {
    key: 'coverage topics (src/config/coverage.ts)',
    provenance: 'assumed',
    usedOn: ['/', '/coverage'],
    note: 'Seven topics drafted from the project description. Cut, reorder or rewrite freely — /coverage and the home page both read from that one file.',
    requiredForLaunch: false,
  },
  {
    key: 'NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL',
    provenance: 'unanswered',
    usedOn: ['/', '/subscribe', 'every subscribe block', 'footer'],
    note: 'The Beehiiv publication and its subscribe URL have not been verified. Add the real subscribe URL once available. Until then, subscribe controls render disabled.',
    requiredForLaunch: true,
  },
  {
    key: 'NEXT_PUBLIC_BEEHIIV_HOME_URL / NEXT_PUBLIC_BEEHIIV_FEED_URL',
    provenance: 'unanswered',
    usedOn: ['footer', '/privacy'],
    note: 'Not supplied. Those footer links are omitted rather than guessed.',
    requiredForLaunch: false,
  },
  {
    key: 'NEXT_PUBLIC_CONTACT_EMAIL',
    provenance: 'unanswered',
    usedOn: ['/contact', '/about', 'footer'],
    note: 'Not supplied. /contact explains that no address is configured yet instead of printing a mailto that goes nowhere.',
    requiredForLaunch: true,
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    provenance: 'unanswered',
    usedOn: ['canonical URLs', 'sitemap', 'social card URLs'],
    note: 'Falls back to $VERCEL_URL then localhost, so previews are correct. Set it on Vercel once the real domain exists.',
    requiredForLaunch: false,
  },
  {
    key: 'BEEHIIV_RSS_URL',
    provenance: 'unanswered',
    usedOn: ['scripts/sync-issues.ts only — never read by the site'],
    note: 'Not supplied, so the archive could not be populated and the feed could not be inspected. Until it is set, npm run sync-issues exits with an error.',
    requiredForLaunch: false,
  },
  {
    key: 'logo file',
    provenance: 'unanswered',
    usedOn: ['header wordmark', 'icons', 'social cards'],
    note: 'Not supplied, so the wordmark is set typographically in Newsreader and the icons are generated from the same treatment. The real logo should replace this — see HANDOFF.md.',
    requiredForLaunch: false,
  },
];

/** Inputs still missing that must be answered before the site goes live. */
export function missingLaunchInputs(): InputRecord[] {
  const unresolved: InputRecord[] = [];

  for (const record of INPUT_LEDGER) {
    if (!record.requiredForLaunch) continue;
    if (record.key === 'publication.authors' && publication.authors[0]?.name) continue;
    if (
      record.key === 'NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL' &&
      process.env.NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL
    ) {
      continue;
    }
    if (record.key === 'NEXT_PUBLIC_CONTACT_EMAIL' && process.env.NEXT_PUBLIC_CONTACT_EMAIL) {
      continue;
    }
    unresolved.push(record);
  }

  return unresolved;
}

/**
 * Refuses to produce a production build while a launch-critical fact is still
 * missing. `npm run preview` sets NOVUS_ALLOW_INCOMPLETE=1 so the site can be
 * reviewed in its unfinished state; a real deployment does not set it, so
 * Vercel fails with a list of exactly what to fill in.
 *
 * Deliberately loud. Silently shipping an about page with no author is the
 * failure mode this whole file exists to prevent.
 */
export function assertLaunchReady(): void {
  // Never in a browser. NOVUS_ALLOW_INCOMPLETE is not a NEXT_PUBLIC_ variable,
  // so it is not inlined into the client bundle, and this check would throw on
  // every page load of a preview build.
  if (typeof window !== 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.NOVUS_ALLOW_INCOMPLETE === '1') return;

  // Build time only.
  //
  // This used to be unnecessary: every route was static, so the module was
  // only ever evaluated while prerendering. Adding /account and /auth/* made
  // some routes dynamic, and a dynamic route re-evaluates the root layout —
  // and therefore this guard — on EVERY REQUEST. A preview built with
  // NOVUS_ALLOW_INCOMPLETE=1 and then served without it answered static pages
  // happily and returned 500 for the dynamic ones, which is a confusing way to
  // discover a missing environment variable.
  //
  // The intent was always to refuse a BUILD, which is the moment the missing
  // fact can still be fixed. A served request is far too late, and failing
  // there breaks a deployment rather than preventing one.
  if (process.env.NEXT_PHASE !== 'phase-production-build') return;

  const missing = missingLaunchInputs();
  if (missing.length === 0) return;

  const lines = missing.map((record) => `  - ${record.key}\n      ${record.note}`);
  throw new Error(
    [
      '',
      'Novus Data cannot build for production yet. These inputs are still missing:',
      '',
      ...lines,
      '',
      'Fill them in (src/config/publication.ts for facts, .env.local or the Vercel',
      'dashboard for environment variables), or set NOVUS_ALLOW_INCOMPLETE=1 to build',
      'an intentionally unfinished preview.',
      '',
    ].join('\n'),
  );
}

/**
 * Refuses to build or serve while the Supabase service role key carries the
 * NEXT_PUBLIC_ prefix.
 *
 * `src/lib/supabase/admin.ts` already throws on this at module load, and that
 * check is correct — but admin.ts is reached only through a dynamic import in
 * `getAccountRepository()`, which runs when an account is deleted and at no
 * other time. A production build therefore never evaluates it, so the mistake
 * that guard describes produces a completely green build and surfaces later,
 * at runtime, on whichever request first touches an account route.
 *
 * The key does not actually leak in that state, because nothing client-reachable
 * references the variable and Next only inlines NEXT_PUBLIC_ literals it finds
 * in client code. But "did not leak" is a property of the current import graph,
 * not a guarantee, and a deployer reading the guard in admin.ts would
 * reasonably believe a green build had already ruled this out.
 *
 * This file is imported by the root layout, so it is evaluated during the
 * build and on the dev server. Checking here makes the refusal happen at the
 * moment the key can still be rotated before anyone has served it.
 *
 * Deliberately NOT gated on NOVUS_ALLOW_INCOMPLETE. That flag means "this site
 * is missing facts I have not supplied yet", which is a legitimate state. A
 * credential published to the browser is never a legitimate state, and a
 * preview build is still a build someone can deploy.
 */
export function assertNoPublicServiceRoleKey(): void {
  // Checked by literal name: Next only inlines literals, so this must not be
  // built up from a variable or it will not be replaced at all.
  if (!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) return;

  throw new Error(
    [
      '',
      'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set.',
      '',
      'The service role key must NEVER carry the NEXT_PUBLIC_ prefix. That prefix',
      'inlines the value into the browser bundle, and this key bypasses row-level',
      'security — so publishing it makes every reader row readable and writable by',
      'anyone who opens the site.',
      '',
      'Rename it to SUPABASE_SERVICE_ROLE_KEY, and rotate the key in the Supabase',
      'dashboard: the old one must be assumed compromised.',
      '',
    ].join('\n'),
  );
}

assertNoPublicServiceRoleKey();

assertLaunchReady();
