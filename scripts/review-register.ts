/**
 * `npm run review` — the weekly register review, as a worklist.
 *
 *   npm run review             every entry, soonest-to-go-stale first
 *   npm run review -- --due    only what is stale or within three days of it
 *
 * WHY THIS EXISTS
 *
 * An entry not reviewed within STALE_AFTER_DAYS renders as stale on its own
 * page. That is the site being honest, and it is the single most likely way for
 * this project to start looking abandoned: not a bug, just a Sunday that got
 * away. The review itself is quick — re-read the sources, change a date, maybe
 * a status — but only if something tells you *which* entries and *what to
 * touch*. Otherwise it means opening every file.
 *
 * This prints the worklist, and for each entry the exact fields to update.
 */

import path from 'node:path';

import { blank, colour, heading, info, loadEnvLocal, ok, plural, warn } from './lib/cli';

/** Entries this close to the window get flagged with `--due` as well. */
const WARN_WITHIN_DAYS = 3;

async function main(): Promise<void> {
  loadEnvLocal();

  const { readDisruptionDiagnostics } = await import('@/lib/disruptions/sources/local-files');
  const { STALE_AFTER_DAYS, daysSince } = await import('@/lib/disruptions/types');

  const args = new Set(process.argv.slice(2));
  const dueOnly = args.has('--due');

  const register = await readDisruptionDiagnostics();

  if (register.entries.length === 0) {
    heading('Register review');
    info('The register is empty — nothing to review.');
    blank();
    console.log(colour.cyan('  npm run new-disruption'));
    blank();
    return;
  }

  const rows = register.entries
    .map((entry) => {
      const age = daysSince(entry.updatedAt);
      return {
        entry,
        age,
        // Negative means overdue. Null age means the date did not parse, which
        // is its own problem and sorts to the very top.
        remaining: age === null ? Number.NEGATIVE_INFINITY : STALE_AFTER_DAYS - age,
      };
    })
    .sort((a, b) => a.remaining - b.remaining);

  const due = rows.filter((row) => row.remaining <= WARN_WITHIN_DAYS);
  const shown = dueOnly ? due : rows;

  heading('Register review');
  info(
    `${plural(register.entries.length, 'entry', 'entries')}, review window ${STALE_AFTER_DAYS} days. ` +
      `${due.length === 0 ? 'Nothing due.' : `${plural(due.length, 'entry', 'entries')} due.`}`,
  );

  if (shown.length === 0) {
    blank();
    ok('Nothing due. The next one falls out of the window in ' + `${rows[0].remaining} days.`);
    blank();
    return;
  }

  for (const { entry, age, remaining } of shown) {
    blank();

    const state =
      age === null
        ? colour.red('unparseable date')
        : remaining < 0
          ? colour.red(`STALE — ${Math.abs(remaining)} days over`)
          : remaining <= WARN_WITHIN_DAYS
            ? colour.amber(`due in ${remaining} days`)
            : colour.dim(`${remaining} days left`);

    console.log(`  ${colour.bold(entry.title)}  ${state}`);
    console.log(
      colour.dim(
        `    ${path.join(register.directory, entry.file)}  ·  ${entry.status}  ·  ` +
          `${plural(entry.sourceCount, 'source')}, ${plural(entry.exposureCount, 'exposure')}`,
      ),
    );
    console.log(colour.dim(`    last reviewed ${entry.updatedAt}${age === null ? '' : ` (${age} days ago)`}`));

    if (remaining <= WARN_WITHIN_DAYS) {
      console.log(colour.cyan('    → re-read the sources, then update:'));
      console.log(colour.cyan('        updatedAt   to today'));
      console.log(colour.cyan('        asOf        on any exposure whose assessment moved'));
      console.log(colour.cyan('        status      if it has eased or resolved'));
      console.log(colour.cyan('        severity    only if the evidence actually changed'));
    }
  }

  if (register.warnings.length > 0) {
    blank();
    heading('Refused while reading these files');
    for (const message of register.warnings) {
      warn(message);
    }
  }

  blank();
  info('A resolved disruption leaves the chart but stays on its entity pages under');
  info('"Resolved" — an assessment that vanishes looks like one that was wrong.');
  blank();
}

main().catch((error: unknown) => {
  console.error(colour.red('\nreview failed to run:'));
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
