/**
 * `npm run doctor` — where the project stands, and the one thing to do next.
 *
 *   npm run doctor              the full report
 *   npm run doctor -- --next    just the next action, one line
 *   npm run doctor -- --strict  exit 1 if anything blocks a deploy
 *
 * WHY THIS EXISTS
 *
 * The information was already in the project, in four places: the input ledger,
 * `.env.local`, the register directory and /debug/content. Three of those need
 * a running dev server and a browser to read. That is a lot of ceremony for the
 * question actually being asked, which is always "what is stopping me, and what
 * do I do now?".
 *
 * It reads the same ledger the production build refuses on, so it cannot drift
 * from what the build enforces. If `doctor` reports no blockers, `npm run build`
 * will not refuse for that reason.
 *
 * **Its output never contains a secret, and that is a deliberate property to
 * keep.** It prints environment variable *names* and whether each is set — never
 * a value. A report like this is exactly the thing someone pastes into a chat
 * when asking for help, and `SUPABASE_SERVICE_ROLE_KEY` bypasses every
 * row-level security policy. If a future edit is tempted to print a value to
 * make an error clearer, print the name and the length instead.
 *
 * NOTE ON THE DYNAMIC IMPORTS. `.env.local` has to be read before any module
 * that captures an environment variable at load time — `DISRUPTIONS_DIRECTORY`
 * does exactly that. Static imports hoist above the call, so the site modules
 * are pulled in inside `main()`, after `loadEnvLocal()`. tsx compiles this file
 * as CommonJS, so top-level await is not available and everything lives in
 * `main()` rather than at module scope.
 */

import {
  blank,
  blocker,
  colour,
  detail,
  heading,
  info,
  loadEnvLocal,
  ok,
  plural,
  warn,
} from './lib/cli';

/** One concrete thing to do, in the order the work actually has to happen. */
interface NextAction {
  summary: string;
  detail: string;
}

/** Where to fix each launch-critical input, in words rather than a key name. */
const FIX_LOCATION: Record<string, string> = {
  'publication.authors':
    'src/config/publication.ts — the `authors` array. The first entry is the editor; give it your name exactly as it should appear in print.',
  NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL:
    '.env.local (and the Vercel dashboard) — your Beehiiv subscribe page URL.',
  NEXT_PUBLIC_CONTACT_EMAIL:
    '.env.local (and the Vercel dashboard) — the address you are content to publish.',
};

async function main(): Promise<void> {
  loadEnvLocal();

  const { INPUT_LEDGER, missingLaunchInputs } = await import('@/config/input-ledger');
  const { publication } = await import('@/config/publication');
  const { readDisruptionDiagnostics } = await import('@/lib/disruptions/sources/local-files');
  const { readDiagnostics } = await import('@/lib/content/sources/local-files');
  const { STALE_AFTER_DAYS, daysSince } = await import('@/lib/disruptions/types');

  const args = new Set(process.argv.slice(2));
  const nextOnly = args.has('--next');
  const strict = args.has('--strict');

  const actions: NextAction[] = [];

  // --- 1. what blocks a production build ------------------------------------

  const missing = missingLaunchInputs();

  if (!nextOnly) {
    heading('Blocking a production build');
    if (missing.length === 0) {
      ok('Nothing. `npm run build` will run.');
    } else {
      for (const record of missing) {
        blocker(colour.bold(record.key));
        detail(FIX_LOCATION[record.key] ?? record.note);
      }
    }
  }

  if (missing.length > 0) {
    actions.push({
      summary: `Fill in ${plural(missing.length, 'launch-critical input')} so the site can build.`,
      detail: missing.map((record) => `  ${record.key}`).join('\n'),
    });
  }

  // --- 2. the register ------------------------------------------------------

  const register = await readDisruptionDiagnostics();

  const staleEntries = register.entries
    .map((entry) => ({ entry, age: daysSince(entry.updatedAt) }))
    .filter((row): row is { entry: (typeof register.entries)[number]; age: number } => {
      return row.age !== null && row.age > STALE_AFTER_DAYS;
    });

  if (!nextOnly) {
    heading('The register');
    if (register.entries.length === 0) {
      warn('Empty. The register and the exposure chart are the product.');
      detail(
        'The site renders a deliberate empty state, which is honest but not worth visiting.\n' +
          'Run `npm run new-disruption` to write the first entry with every required\n' +
          'field prompted, so nothing can be silently dropped.',
      );
    } else {
      ok(`${plural(register.entries.length, 'entry', 'entries')} in ${register.directory}`);

      if (staleEntries.length > 0) {
        warn(
          `${plural(staleEntries.length, 'entry', 'entries')} past the ${STALE_AFTER_DAYS}-day review window`,
        );
        for (const { entry, age } of staleEntries) {
          detail(`${entry.id} — last reviewed ${entry.updatedAt} (${age} days ago)`);
        }
      } else {
        ok('Every entry is inside the review window.');
      }
    }

    if (register.warnings.length > 0) {
      blank();
      warn(
        `${plural(register.warnings.length, 'warning')} from the register — each line says ` +
          'exactly what was dropped or corrected',
      );
      for (const message of register.warnings) detail(message);
    } else if (register.entries.length > 0) {
      ok('No refused claims — every exposure carries mechanism, confidence, date and source.');
    }
  }

  if (register.entries.length === 0) {
    actions.push({
      summary: 'Write the first register entry — it is what makes the site worth visiting.',
      detail: '  npm run new-disruption',
    });
  } else if (register.warnings.length > 0) {
    actions.push({
      summary: `Resolve ${plural(register.warnings.length, 'register warning')} — each is something the site refused or corrected.`,
      detail: register.warnings.map((message) => `  ${message}`).join('\n'),
    });
  } else if (staleEntries.length > 0) {
    actions.push({
      summary: `Re-review ${plural(staleEntries.length, 'stale entry', 'stale entries')}.`,
      detail: '  npm run review',
    });
  }

  // --- 3. the briefing archive ----------------------------------------------

  const archive = await readDiagnostics();
  const hasFeedUrl = Boolean(process.env.BEEHIIV_RSS_URL);

  if (!nextOnly) {
    heading('The briefing archive');
    if (archive.issues.length === 0) {
      info('Empty. /briefings says so rather than pretending otherwise.');
      if (!hasFeedUrl) {
        detail(
          'BEEHIIV_RSS_URL is not set, so `npm run sync-issues` cannot run.\n' +
            'Beehiiv shows the feed URL in the publication settings — do not guess it.',
        );
      }
    } else {
      ok(`${plural(archive.issues.length, 'issue')} archived`);
    }

    if (archive.warnings.length > 0) {
      warn(`${plural(archive.warnings.length, 'warning')} from the archive`);
      for (const message of archive.warnings) detail(message);
    }
  }

  // --- 4. optional, and why each one is safe to leave unset -----------------

  const optional = [
    {
      label: 'NEXT_PUBLIC_SITE_URL',
      set: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      note: 'Falls back to $VERCEL_URL then localhost. Set it on Vercel at domain cutover and REDEPLOY — it is read at build time.',
    },
    {
      label: 'NEXT_PUBLIC_BEEHIIV_HOME_URL',
      set: Boolean(process.env.NEXT_PUBLIC_BEEHIIV_HOME_URL),
      note: 'Footer link to the publication. Omitted rather than guessed.',
    },
    {
      label: 'NEXT_PUBLIC_BEEHIIV_FEED_URL',
      set: Boolean(process.env.NEXT_PUBLIC_BEEHIIV_FEED_URL),
      note: 'Footer RSS link for readers. Separate from BEEHIIV_RSS_URL, which is a build tool input.',
    },
    {
      // Name only, never the value — see the note at the top of this file.
      label: 'AISSTREAM_API_KEY',
      set: Boolean(process.env.AISSTREAM_API_KEY?.trim()),
      note: 'Enables the chokepoint vessel counts on /monitor; without it that one panel says "not switched on yet". Free at aisstream.io. Server only — set it in .env.local and on Vercel, never with a NEXT_PUBLIC_ prefix. DEPLOY.md Part 5.',
    },
    {
      label: 'FINNHUB_API_KEY',
      set: Boolean(process.env.FINNHUB_API_KEY?.trim()),
      note: 'Share prices on /monitor; that panel says "not switched on yet" without it. A licensing decision before a configuration step — Finnhub\'s free plan is non-commercial and public display is redistribution. DEPLOY.md Part 6.',
    },
    {
      label: 'BEEHIIV_RSS_URL',
      set: hasFeedUrl,
      note: 'Read only by `npm run sync-issues`. Never needed on Vercel.',
    },
    {
      label: 'publication.cadence',
      set: publication.cadence !== null,
      note: 'Null, so subscribe blocks claim no schedule. Set it once one is genuinely being kept.',
    },
    {
      label: 'publication.authors[].credentials',
      set: publication.authors.some((author) => author.credentials.length > 0),
      note: 'Empty, so /about states nothing beyond the names. Add only facts true and checkable today.',
    },
  ];

  if (!nextOnly) {
    heading('Optional — the site is correct without these');
    for (const item of optional) {
      if (item.set) {
        ok(item.label);
      } else {
        info(`${item.label} — not set`);
        detail(item.note);
      }
    }
  }

  // --- 5. drafted copy awaiting your signature ------------------------------

  const drafted = INPUT_LEDGER.filter((record) => record.provenance === 'assumed');

  if (!nextOnly) {
    heading('Drafted for you — read before launch');
    info(`${plural(drafted.length, 'field')} were written from your project description, not by you.`);
    for (const record of drafted) {
      detail(`${record.key}  →  ${record.usedOn.join(', ')}`);
    }
    blank();
    detail(
      'publication.methodology is the one to read line by line: it publishes a standard\n' +
        'of proof at /about#method. If a sentence describes a process you are not\n' +
        'actually following yet, cut the sentence.',
    );
  }

  // --- 6. the next action ---------------------------------------------------

  if (actions.length === 0) {
    actions.push({
      summary: 'Nothing is blocking you. Deploy, then keep the register current.',
      detail:
        '  npm run build     then follow the launch runbook\n' +
        '  npm run review    weekly, to keep entries inside the review window',
    });
  }

  const next = actions[0];

  if (nextOnly) {
    console.log(next.summary);
  } else {
    heading('Do this next');
    console.log(`  ${colour.bold(next.summary)}`);
    if (next.detail) {
      blank();
      console.log(colour.cyan(next.detail));
    }
    if (actions.length > 1) {
      blank();
      info(`${plural(actions.length - 1, 'other thing')} queued behind it:`);
      for (const action of actions.slice(1)) detail(action.summary);
    }
    blank();
  }

  if (strict && missing.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(colour.red('\ndoctor failed to run:'));
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
