/**
 * Shared plumbing for the author-facing scripts.
 *
 * These scripts exist to remove failure modes from a weekly routine rather than
 * to add a build step. Three rules they all follow:
 *
 *   1. **No new dependencies.** CLAUDE.md Rule 4 — this is all node: builtins
 *      and what the project already has.
 *   2. **They never write to content/ without being asked.** Reading, checking
 *      and reporting are safe to run at any time; only `new-disruption` writes,
 *      and only after showing the file it is about to create.
 *   3. **They print what to do next.** A diagnostic that stops at "3 warnings"
 *      makes the reader do the translation. Every message here names the file
 *      and the fix.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// --- colour -----------------------------------------------------------------

/**
 * Colour only when a human is watching. Piping into a file or a CI log should
 * produce clean text, and NO_COLOR is the established opt-out.
 */
const useColour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function wrap(open: string, close: string) {
  return (text: string): string => (useColour ? `[${open}m${text}[${close}m` : text);
}

export const colour = {
  bold: wrap('1', '22'),
  dim: wrap('2', '22'),
  red: wrap('31', '39'),
  amber: wrap('33', '39'),
  green: wrap('32', '39'),
  blue: wrap('34', '39'),
  cyan: wrap('36', '39'),
  underline: wrap('4', '24'),
};

// --- output -----------------------------------------------------------------

export function heading(text: string): void {
  console.log(`\n${colour.bold(text)}`);
  console.log(colour.dim('─'.repeat(Math.min(text.length, 72))));
}

export function blank(): void {
  console.log('');
}

/** A blocking problem: the build or the deploy will not work until it is fixed. */
export function blocker(text: string): void {
  console.log(`  ${colour.red('✗')} ${text}`);
}

/** Worth doing, not blocking. */
export function warn(text: string): void {
  console.log(`  ${colour.amber('!')} ${text}`);
}

export function ok(text: string): void {
  console.log(`  ${colour.green('✓')} ${text}`);
}

export function info(text: string): void {
  console.log(`  ${colour.dim('·')} ${text}`);
}

/** Indented supporting detail under a bullet. */
export function detail(text: string): void {
  for (const line of text.split('\n')) {
    console.log(`      ${colour.dim(line)}`);
  }
}

// --- environment ------------------------------------------------------------

/**
 * Read `.env.local` the way Next does, so a script reports the same state the
 * dev server sees.
 *
 * Deliberately minimal: `KEY=value`, `#` comments, optional surrounding quotes.
 * It does not do variable expansion or multi-line values, because nothing in
 * this project's `.env.example` uses either and a half-correct parser that
 * silently mangles a value is worse than one with an obvious limit.
 *
 * Values already present in `process.env` win, matching Next's precedence.
 */
export function loadEnvLocal(root: string = process.cwd()): void {
  const file = path.join(root, '.env.local');
  if (!existsSync(file)) return;

  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value) process.env[key] = value;
  }
}

// --- dates ------------------------------------------------------------------

/** Today as `YYYY-MM-DD`, in the machine's own timezone. */
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

// --- strings ----------------------------------------------------------------

/**
 * The same slug rule the register enforces at load time (`ID_PATTERN`), so a
 * scaffolded id is never rejected by the loader that reads it back.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** Quote a YAML scalar safely. Everything the scaffolder writes goes through this. */
export function yamlString(value: string | null): string {
  // JSON strings are valid YAML double-quoted scalars, escaping included —
  // newlines too, which a hand-rolled escape would leave raw for YAML to
  // fold into a space.
  return value === null ? 'null' : JSON.stringify(value);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

// --- prompting --------------------------------------------------------------

export interface Prompter {
  question(prompt: string): Promise<string>;
  close(): void;
}

/**
 * A line-at-a-time prompter that works both at a terminal and off a pipe.
 *
 * The pipe case is not a nicety. `node:readline` drains a small piped payload
 * and emits `close` while the *first* `question()` is still awaiting, so every
 * later call returns a promise that never settles — the process then exits
 * silently, mid-interview, with status 0. That is indistinguishable from
 * success and it makes the scaffolder impossible to test or script.
 *
 * So: at a TTY, use readline. Off a pipe, read stdin to the end first and serve
 * the answers from a queue, echoing each one so the transcript still reads like
 * a session. Running out of piped answers is an error, not a silent stop.
 */
export function createPrompter(): Prompter {
  if (process.stdin.isTTY) {
    // Required lazily: importing readline pulls in a fair amount, and the
    // scripted path below never needs it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const readline = require('node:readline') as typeof import('node:readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    return {
      question: (prompt) =>
        new Promise<string>((resolve) => {
          rl.question(prompt, resolve);
        }),
      close: () => rl.close(),
    };
  }

  let queue: string[] | null = null;

  async function readAllStdin(): Promise<string[]> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf8');
    // A trailing newline produces one empty element; that is a real (empty)
    // answer only if the caller wrote it, so drop just the final separator.
    return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
  }

  return {
    async question(prompt) {
      queue ??= await readAllStdin();

      if (queue.length === 0) {
        throw new Error(
          `Ran out of scripted input at: ${prompt.trim()}\n` +
            'Piped input must supply one line per prompt, including blank lines for defaults.',
        );
      }

      const answer = queue.shift() ?? '';
      process.stdout.write(`${prompt}${answer}\n`);
      return answer;
    },
    close: () => {},
  };
}
