import { LiveAge } from '@/components/live/live-age';
import { ExternalLink, TextLink } from '@/components/text-link';
import { SOURCE_META } from '@/lib/live/meta';
import { nodeById } from '@/lib/live/nodes';
import { FLAG_LEVEL_LABELS, type LiveFlag } from '@/lib/live/types';

/**
 * "Needs attention": every flag the rules raised, alerts first.
 *
 * The level is a word, never a colour alone, and amber is not used — it is
 * reserved for the register's "active" status and a flag is not a register
 * status. An alert gets a heavier left rule; that is emphasis, and the word
 * is still there for anyone who cannot see it.
 *
 * Empty is a real state and says so plainly. A monitor that always finds
 * something to flag is a monitor that has stopped meaning anything.
 */
export function FlagList({
  flags,
  rules,
  complete,
}: {
  flags: LiveFlag[];
  rules: Array<{ id: string; text: string }>;
  /** False when some feeds were unavailable, so "nothing flagged" is not overclaimed. */
  complete: boolean;
}) {
  return (
    <>
      {flags.length === 0 ? (
        <p className="border-l-2 border-rule pl-3 text-[0.9375rem] text-muted">
          Nothing crossed a rule at the last update
          {complete ? '.' : ', among the feeds that answered — some did not, and they are listed under Feed status below.'}
        </p>
      ) : (
        <ul className="border-b border-hairline">
          {flags.map((flag) => (
            <li
              key={flag.id}
              className={`grid gap-x-5 gap-y-1 border-t border-hairline py-3 pl-3 sm:grid-cols-[4.5rem_1fr] ${
                flag.level === 'alert' ? 'border-l-2 border-l-link' : 'border-l-2 border-l-transparent'
              }`}
            >
              <span className={`kicker ${flag.level === 'alert' ? '' : 'kicker-muted'} pt-1`}>
                {FLAG_LEVEL_LABELS[flag.level]}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold leading-snug text-fg">{flag.title}</span>
                <span className="mt-0.5 block text-[0.9375rem] text-muted">{flag.detail}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-meta text-muted">
                  <span>
                    {SOURCE_META[flag.source].name}, <LiveAge at={flag.at} precision={SOURCE_META[flag.source].asOfPrecision} />
                  </span>
                  {flag.placeId ? (
                    <TextLink href={`#place-${flag.placeId}`}>
                      {nodeById(flag.placeId)?.name ?? flag.placeId} on the place board
                    </TextLink>
                  ) : null}
                  {flag.href ? <ExternalLink href={flag.href}>Source</ExternalLink> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-meta text-link">How flags are raised</summary>
        <p className="mt-3 max-w-[72ch] text-meta text-muted">
          A flag is a published rule firing on a reading — a reason to look, not a finding. Nothing
          here weighs one reading against another or says what it means for any company; that is
          what the register is for.
        </p>
        <ul className="mt-2 max-w-[72ch] space-y-1.5 text-meta text-fg">
          {rules.map((rule) => (
            <li key={rule.id} className="border-l-2 border-rule pl-3">
              {rule.text}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
