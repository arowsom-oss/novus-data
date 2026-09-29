import { ExternalActionLink, UnavailableAction } from '@/components/action';
import { publication } from '@/config/publication';
import { env } from '@/lib/env';

/**
 * Subscribing happens on Beehiiv, which owns delivery, the subscriber list and
 * compliance. The site's job is to make the step obvious and get out of the
 * way. There is deliberately no email field here: with no backend, a form
 * would discard addresses silently, which is worse than no form.
 */
export function SubscribePanel({
  heading = 'Subscribe',
  tone = 'panel',
}: {
  heading?: string;
  /** `panel` for a raised block, `plain` for the end of an issue. */
  tone?: 'panel' | 'plain';
}) {
  // Only ever states a schedule that has actually been committed to.
  const cadenceLine = publication.cadence
    ? `Published ${publication.cadence}, by email. Free.`
    : 'Delivered by email. Free.';

  return (
    <section
      aria-labelledby="subscribe-heading"
      className={
        tone === 'panel'
          ? 'border border-hairline bg-surface p-7 sm:p-10'
          : 'border-t border-hairline pt-10'
      }
    >
      <h2
        id="subscribe-heading"
        className="text-heading font-semibold text-fg"
      >
        {heading}
      </h2>
      <p className="mt-3 max-w-[52ch] text-muted">{cadenceLine}</p>

      <div className="mt-6">
        {env.subscribeUrl ? (
          <ExternalActionLink href={env.subscribeUrl}>Subscribe on Beehiiv</ExternalActionLink>
        ) : (
          <>
            <UnavailableAction>Subscribe on Beehiiv</UnavailableAction>
            <p className="mt-3 max-w-[52ch] text-meta text-muted">
              No subscribe link is configured yet. Set{' '}
              <code className="[overflow-wrap:anywhere]">
                NEXT_PUBLIC_BEEHIIV_SUBSCRIBE_URL
              </code>{' '}
              to enable this.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
