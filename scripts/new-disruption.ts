/**
 * `npm run new-disruption` — write a register entry that is guaranteed to load.
 *
 *   npm run new-disruption              interactive, prompts every field
 *   npm run new-disruption -- --template   write an annotated blank file instead
 *
 * WHY THIS EXISTS
 *
 * The register's loader drops anything it cannot check: an exposure missing a
 * mechanism, a confidence, an `asOf` date or a source never becomes a cell, and
 * a disruption with no source of its own is skipped entirely. That strictness
 * is the product — but the failure is *silent on the page*. You find out by
 * noticing an entry you wrote is not there, then opening /debug/content.
 *
 * This asks for every required field in order and refuses to move on until the
 * answer would survive the loader. The validation here deliberately mirrors
 * `src/lib/disruptions/sources/local-files.ts`:
 *
 *   ID_PATTERN            lowercase, digits, single hyphens (imported, not copied)
 *   sources               title + url + publisher, url must be http(s)
 *   exposure gate         mechanism, confidence, asOf, and >= 1 source
 *   entity                id, name, kind, sector — ticker may be null
 *
 * **If that loader ever changes, change this file in the same commit.** A
 * scaffolder that writes files the loader rejects is worse than no scaffolder.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  CONFIDENCES,
  DISRUPTION_CATEGORIES,
  DISRUPTION_STATUSES,
  ID_PATTERN,
  SEVERITIES,
} from '@/lib/disruptions/types';
import {
  blank,
  colour,
  createPrompter,
  heading,
  info,
  isIsoDate,
  ok,
  slugify,
  today,
  warn,
  yamlString,
  type Prompter,
} from './lib/cli';

/**
 * Where entries are written.
 *
 * Respects NOVUS_DISRUPTIONS_DIR for the same reason `doctor` and `review` do:
 * all three are author tooling reading and writing one register, and they have
 * to agree about where it is. This used to hardcode `content/disruptions`, so
 * with the override set in `.env.local` — which `loadEnvLocal()` reads — a
 * freshly scaffolded entry landed in the real register while `doctor` and
 * `review` were reading somewhere else, and the entry appeared to have
 * vanished. Every path this script prints is relative to cwd, so an override
 * is visible in the output rather than silent.
 */
const DISRUPTIONS_DIR = process.env.NOVUS_DISRUPTIONS_DIR
  ? path.resolve(process.env.NOVUS_DISRUPTIONS_DIR)
  : path.join(process.cwd(), 'content', 'disruptions');

// The register's own lists, so a new status or category reaches the prompts
// in the same commit that teaches the loader about it.
const STATUSES = DISRUPTION_STATUSES;
const CATEGORIES = DISRUPTION_CATEGORIES;
const KINDS = ['company', 'sector'] as const;

/** What each confidence level actually commits you to, quoted from /about#method. */
const CONFIDENCE_HELP: Record<(typeof CONFIDENCES)[number], string> = {
  reported: 'the company or a regulator said so, or a named report documents it',
  inferred: 'follows from disclosed facts — a filing, a route map, a customer list',
  estimated: 'a judgement from indirect evidence. Say so plainly and keep it rare',
};

const SEVERITY_HELP: Record<(typeof SEVERITIES)[number], string> = {
  low: 'measurable but absorbable — margin, not operations',
  moderate: 'material to a segment, a route or a quarter',
  high: 'reaches the business as a whole',
};

interface SourceInput {
  title: string;
  url: string;
  publisher: string;
  retrievedAt: string;
}

interface ExposureInput {
  entityName: string;
  entityId: string;
  entityKind: (typeof KINDS)[number];
  ticker: string | null;
  sector: string;
  severity: (typeof SEVERITIES)[number];
  confidence: (typeof CONFIDENCES)[number];
  mechanism: string;
  asOf: string;
  sources: SourceInput[];
}

interface DisruptionInput {
  id: string;
  /** An `id` from publication.authors, or null when nobody is named yet. */
  author: string | null;
  /** Tracked place ids from src/lib/live/nodes.ts. Mirrors the loader: unknown ids are refused here. */
  places: string[];
  title: string;
  shortLabel: string;
  status: (typeof STATUSES)[number];
  category: (typeof CATEGORIES)[number];
  startedAt: string;
  updatedAt: string;
  summary: string;
  sources: SourceInput[];
  exposures: ExposureInput[];
}

// --- prompting --------------------------------------------------------------

/** Ask until the answer validates. `validate` returns an error string or null. */
async function ask(
  rl: Prompter,
  question: string,
  options: {
    help?: string;
    fallback?: string;
    validate?: (value: string) => string | null;
    allowEmpty?: boolean;
  } = {},
): Promise<string> {
  const { help, fallback, validate, allowEmpty } = options;

  if (help) console.log(colour.dim(`  ${help}`));

  for (;;) {
    const suffix = fallback ? colour.dim(` [${fallback}]`) : '';
    const answer = (await rl.question(`  ${colour.bold(question)}${suffix} `)).trim();
    const value = answer || fallback || '';

    if (!value) {
      if (allowEmpty) return '';
      console.log(colour.red('    Required.'));
      continue;
    }

    const error = validate?.(value);
    if (error) {
      console.log(colour.red(`    ${error}`));
      continue;
    }

    return value;
  }
}

async function askChoice<T extends string>(
  rl: Prompter,
  question: string,
  choices: readonly T[],
  help?: Record<T, string>,
  fallback?: T,
): Promise<T> {
  if (help) {
    for (const choice of choices) {
      console.log(colour.dim(`    ${choice.padEnd(10)} ${help[choice]}`));
    }
  }

  const value = await ask(rl, `${question} (${choices.join(' / ')})`, {
    fallback,
    validate: (input) =>
      (choices as readonly string[]).includes(input.toLowerCase())
        ? null
        : `Must be one of: ${choices.join(', ')}`,
  });

  return value.toLowerCase() as T;
}

async function askYesNo(rl: Prompter, question: string, fallback: boolean): Promise<boolean> {
  const value = await ask(rl, `${question} (y/n)`, {
    fallback: fallback ? 'y' : 'n',
    validate: (input) => (/^[yn]/i.test(input) ? null : 'Answer y or n.'),
  });
  return /^y/i.test(value);
}

async function askDate(rl: Prompter, question: string, fallback?: string): Promise<string> {
  return ask(rl, question, {
    fallback,
    validate: (value) => (isIsoDate(value) ? null : 'Use YYYY-MM-DD.'),
  });
}

async function askUrl(rl: Prompter, question: string): Promise<string> {
  return ask(rl, question, {
    validate: (value) =>
      /^https?:\/\/\S+$/i.test(value)
        ? null
        : 'Must start with http:// or https:// — the loader drops anything else.',
  });
}

function validateId(value: string): string | null {
  return ID_PATTERN.test(value)
    ? null
    : 'Lowercase letters, digits and single hyphens only.';
}

// --- the sub-flows ----------------------------------------------------------

async function askSources(rl: Prompter, context: string, minimum: number): Promise<SourceInput[]> {
  const sources: SourceInput[] = [];

  for (;;) {
    const index = sources.length + 1;

    if (sources.length >= minimum) {
      blank();
      const more = await askYesNo(rl, `Add ${sources.length === 0 ? 'a' : 'another'} source for ${context}?`, false);
      if (!more) break;
    } else {
      blank();
      console.log(colour.dim(`  ${context} needs at least ${minimum} source. This is source ${index}.`));
    }

    const title = await ask(rl, 'Source title', {
      help: 'The document, not the website. "Advisory to Shipping No. 31-2026".',
    });
    const url = await askUrl(rl, 'Source URL');
    const publisher = await ask(rl, 'Publisher', {
      help: 'Who published it — "Panama Canal Authority", not "the internet".',
    });
    const retrievedAt = await askDate(rl, 'Date you read it', today());

    sources.push({ title, url, publisher, retrievedAt });
    ok(`Source ${index} recorded.`);
  }

  return sources;
}

async function askExposure(rl: Prompter, index: number): Promise<ExposureInput> {
  heading(`Exposure ${index}`);
  console.log(
    colour.dim(
      '  This is the claim that a named problem reaches a named company. It renders\n' +
        '  as a coloured cell someone may act on, so all four checks below are enforced.',
    ),
  );
  blank();

  const entityKind = await askChoice(rl, 'Is this a company or a sector?', KINDS, undefined, 'company');
  const entityName = await ask(rl, `${entityKind === 'company' ? 'Company' : 'Sector'} name`);
  const entityId = await ask(rl, 'Entity id (its permanent URL)', {
    fallback: slugify(entityName),
    validate: validateId,
  });

  const tickerAnswer = await ask(rl, 'Ticker', {
    help: 'Leave blank if it has none or you are not certain. Never invent one.',
    allowEmpty: true,
  });
  const ticker = tickerAnswer || null;

  const sector = await ask(rl, 'Sector', {
    help: 'The industry it sits in — "Marine shipping", "Semiconductors".',
    fallback: entityKind === 'sector' ? entityName : undefined,
  });

  blank();
  const severity = await askChoice(rl, 'Severity', SEVERITIES, SEVERITY_HELP);
  blank();
  const confidence = await askChoice(rl, 'Confidence', CONFIDENCES, CONFIDENCE_HELP);

  blank();
  const mechanism = await ask(rl, 'Mechanism', {
    help:
      'One sentence on HOW the problem reaches this name. "Affected" is not a finding.\n' +
      '  Good: "routes roughly a fifth of its Asia–Europe volume through the canal".',
    validate: (value) =>
      value.length < 20
        ? 'Too short to be a mechanism. Say how the problem reaches this name.'
        : null,
  });

  const asOf = await askDate(rl, 'As of (when this assessment was last true)', today());

  const sources = await askSources(rl, `exposure ${index} (${entityName})`, 1);

  return {
    entityName,
    entityId,
    entityKind,
    ticker,
    sector,
    severity,
    confidence,
    mechanism,
    asOf,
    sources,
  };
}

// --- rendering --------------------------------------------------------------

function renderSources(sources: SourceInput[], indent: string): string {
  return sources
    .map((source) =>
      [
        `${indent}- title: ${yamlString(source.title)}`,
        `${indent}  url: ${yamlString(source.url)}`,
        `${indent}  publisher: ${yamlString(source.publisher)}`,
        `${indent}  retrievedAt: ${yamlString(source.retrievedAt)}`,
      ].join('\n'),
    )
    .join('\n');
}

function render(entry: DisruptionInput): string {
  const lines: string[] = [
    '---',
    `id: ${yamlString(entry.id)}`,
    `title: ${yamlString(entry.title)}`,
    `shortLabel: ${yamlString(entry.shortLabel)}`,
    `status: ${yamlString(entry.status)}`,
    `category: ${yamlString(entry.category)}`,
    `startedAt: ${yamlString(entry.startedAt)}`,
    `updatedAt: ${yamlString(entry.updatedAt)}`,
    `summary: ${yamlString(entry.summary)}`,
    ...(entry.author ? [`author: ${yamlString(entry.author)}`] : []),
    ...(entry.places.length > 0 ? [`places: [${entry.places.map((p) => yamlString(p)).join(', ')}]`] : []),
    'sources:',
    renderSources(entry.sources, '  '),
  ];

  if (entry.exposures.length > 0) {
    lines.push('exposures:');
    for (const exposure of entry.exposures) {
      lines.push(
        '  - entity:',
        `      id: ${yamlString(exposure.entityId)}`,
        `      name: ${yamlString(exposure.entityName)}`,
        `      kind: ${yamlString(exposure.entityKind)}`,
        `      ticker: ${exposure.ticker ? yamlString(exposure.ticker) : 'null'}`,
        `      sector: ${yamlString(exposure.sector)}`,
        `    severity: ${yamlString(exposure.severity)}`,
        `    confidence: ${yamlString(exposure.confidence)}`,
        `    mechanism: ${yamlString(exposure.mechanism)}`,
        `    asOf: ${yamlString(exposure.asOf)}`,
        '    sources:',
        renderSources(exposure.sources, '      '),
      );
    }
  } else {
    lines.push('exposures: []');
  }

  lines.push('---', '');

  return `${lines.join('\n')}\n`;
}

const TEMPLATE = `---
# Every field above the --- is read by the loader. Anything it cannot check is
# dropped, with a warning naming this file — run \`npm run doctor\` to see them.

id: "replace-me"                 # permanent URL. lowercase, digits, single hyphens
title: "Replace me"
shortLabel: "RPL"                # 2-4 chars, the chart column header
status: "watch"                  # watch | active | easing | resolved
category: "chokepoint"           # chokepoint | port | policy | input | energy | labour | weather
startedAt: "${today()}"
updatedAt: "${today()}"          # the review date. Required, and re-set it every review.
summary: "One or two plain sentences."

# Who made this assessment — an id from publication.authors. Delete the line
# on a one-author publication; it falls back to the editor either way.
# author: "editor"

# Tracked places this concerns, so the monitor's place board shows this entry
# beside the live readings there. Optional. Ids are in src/lib/live/nodes.ts;
# an unknown id is dropped with a warning.
# places: ["suez", "bab-el-mandeb"]

# At least one, or the whole entry is skipped.
sources:
  - title: "The document, not the website"
    url: "https://example.org/..."
    publisher: "Who published it"
    retrievedAt: "${today()}"

# Each exposure needs ALL FOUR of mechanism, confidence, asOf and sources,
# or it silently does not render. Delete this block if you have none yet.
exposures:
  - entity:
      id: "example-co"
      name: "Example Co"
      kind: "company"            # company | sector
      ticker: null               # or "EXCO" — never invented
      sector: "Marine shipping"
    severity: "moderate"         # low | moderate | high
    confidence: "reported"       # reported | inferred | estimated
    mechanism: "How the disruption reaches this company, in a sentence."
    asOf: "${today()}"
    sources:
      - title: "Q3 trading statement"
        url: "https://example.com/..."
        publisher: "Example Co"
        retrievedAt: "${today()}"
---

<p>Optional analysis body. Plain HTML, and it is rendered as-is.</p>
`;

// --- file placement ---------------------------------------------------------

/** Next free `NN-` prefix. The number is filing order; the id is the URL. */
async function nextPrefix(): Promise<string> {
  if (!existsSync(DISRUPTIONS_DIR)) return '01';

  const files = await readdir(DISRUPTIONS_DIR);
  let highest = 0;

  for (const file of files) {
    const match = /^(\d+)-/.exec(file);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return String(highest + 1).padStart(2, '0');
}

// --- main -------------------------------------------------------------------

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  await mkdir(DISRUPTIONS_DIR, { recursive: true });

  if (args.has('--template')) {
    const prefix = await nextPrefix();
    const file = path.join(DISRUPTIONS_DIR, `${prefix}-replace-me.md`);

    if (existsSync(file)) {
      warn(`${path.relative(process.cwd(), file)} already exists. Nothing written.`);
      return;
    }

    await writeFile(file, TEMPLATE, 'utf8');
    ok(`Wrote ${path.relative(process.cwd(), file)}`);
    info('Fill it in, rename the file to match the id, then run `npm run doctor`.');
    return;
  }

  const rl = createPrompter();

  try {
    heading('New register entry');
    console.log(
      colour.dim(
        '  Every answer is checked against the same rules the site enforces at load\n' +
          '  time, so anything this writes will render. Ctrl-C to abandon.',
      ),
    );
    blank();

    const title = await ask(rl, 'Title', {
      help: 'What is going wrong, in a headline. "Panama Canal slot restrictions".',
    });

    const id = await ask(rl, 'Id (permanent URL)', {
      help: 'This becomes /disruptions/<id> and must never change once published.',
      fallback: slugify(title),
      validate: validateId,
    });

    const shortLabel = (
      await ask(rl, 'Short label', {
        help: '2–4 characters. It is the column header on the exposure chart.',
        fallback: id.replace(/-/g, '').slice(0, 3).toUpperCase(),
        validate: (value) =>
          value.length >= 2 && value.length <= 4 ? null : 'Between 2 and 4 characters.',
      })
    ).toUpperCase();

    blank();
    const status = await askChoice(rl, 'Status', STATUSES, {
      watch: 'not yet disrupting, but the conditions are in place',
      active: 'currently constraining trade',
      easing: 'still present, measurably improving',
      resolved: 'over. Kept in the register because the record matters',
    });

    blank();
    const category = await askChoice(rl, 'Category', CATEGORIES);

    blank();
    const startedAt = await askDate(rl, 'Started at');
    const updatedAt = await askDate(rl, 'Reviewed today?', today());

    blank();
    const summary = await ask(rl, 'Summary', {
      help: 'One or two plain sentences. It is what the register list shows.',
      validate: (value) => (value.length < 30 ? 'Too short — write a real sentence.' : null),
    });

    // Attribution. Only asked once there is more than one person on the
    // masthead — with one author the answer is always the same and the prompt
    // is pure friction. With two, an unattributed entry is the thing the
    // register cannot afford, so it is asked before the sources.
    const { namedAuthors } = await import('@/config/publication');
    const roster = namedAuthors();
    let author: string | null = null;

    if (roster.length > 1) {
      blank();
      console.log(colour.dim('  Who made this assessment? It is shown on the entry and in the feed.'));
      for (const person of roster) {
        console.log(colour.dim(`    ${person.id.padEnd(14)} ${person.name}`));
      }
      author = await ask(rl, 'Author id', {
        fallback: roster[0].id,
        validate: (value) =>
          roster.some((person) => person.id === value)
            ? null
            : `Must be one of: ${roster.map((person) => person.id).join(', ')}`,
      });
    } else if (roster.length === 1) {
      // Recorded anyway, so that adding a second author later does not leave
      // the earlier entries looking anonymous next to the attributed ones.
      author = roster[0].id;
    } else {
      warn('No author is named in publication.authors yet — this entry will carry no byline.');
    }

    // Places. Optional, and validated here exactly as the loader validates
    // them, so a scaffolded entry never links a place that does not exist.
    const { ALL_NODES } = await import('@/lib/live/nodes');
    blank();
    console.log(colour.dim('  Tracked places this concerns (optional). The monitor lists this entry beside them.'));
    console.log(colour.dim(`  Ids: ${ALL_NODES.map((node) => node.id).join(', ')}`));
    const placesAnswer = await ask(rl, 'Places, comma-separated', {
      allowEmpty: true,
      validate: (value) => {
        const unknown = value
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part && !ALL_NODES.some((node) => node.id === part));
        return unknown.length > 0 ? `Not tracked places: ${unknown.join(', ')}` : null;
      },
    });
    const places = [...new Set(placesAnswer.split(',').map((part) => part.trim()).filter(Boolean))];

    heading('Sources for the disruption itself');
    console.log(colour.dim('  With none of these the whole entry is skipped.'));
    const sources = await askSources(rl, 'this disruption', 1);

    const exposures: ExposureInput[] = [];
    heading('Exposures');
    console.log(
      colour.dim(
        '  Which companies or sectors this reaches. You can add none now and come\n' +
          '  back later — the entry still publishes, it just has no chart column.',
      ),
    );

    for (;;) {
      blank();
      const another = await askYesNo(
        rl,
        exposures.length === 0 ? 'Add an exposure?' : 'Add another exposure?',
        exposures.length === 0,
      );
      if (!another) break;
      exposures.push(await askExposure(rl, exposures.length + 1));
    }

    const entry: DisruptionInput = {
      id,
      author,
      places,
      title,
      shortLabel,
      status,
      category,
      startedAt,
      updatedAt,
      summary,
      sources,
      exposures,
    };

    const contents = render(entry);
    const prefix = await nextPrefix();
    const file = path.join(DISRUPTIONS_DIR, `${prefix}-${id}.md`);
    const relative = path.relative(process.cwd(), file);

    heading(`About to write ${relative}`);
    console.log(colour.dim(contents.replace(/^/gm, '  ')));

    const confirmed = await askYesNo(rl, 'Write it?', true);
    if (!confirmed) {
      warn('Nothing written.');
      return;
    }

    if (existsSync(file)) {
      warn(`${relative} already exists. Nothing written.`);
      return;
    }

    await writeFile(file, contents, 'utf8');

    blank();
    ok(`Wrote ${relative}`);
    info('Next: `npm run doctor` to confirm nothing was refused, then commit and push.');
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  // Ctrl-C through readline rejects the pending question; that is a normal exit,
  // not a crash, and it should not print a stack trace at someone.
  if (error instanceof Error && /closed|abort/i.test(error.message)) {
    console.log(colour.dim('\nAbandoned. Nothing written.'));
    return;
  }
  console.error(colour.red('\nnew-disruption failed:'));
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
