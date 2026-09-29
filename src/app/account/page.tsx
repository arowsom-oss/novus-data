import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Container } from '@/components/container';
import { TextLink } from '@/components/text-link';
import { getCurrentAccount } from '@/lib/accounts/session';
import { SEVERITY_LABELS } from '@/lib/disruptions/types';
import { CATEGORY_LABELS, DISRUPTION_CATEGORIES, SEVERITIES } from '@/lib/disruptions/types';
import { listEntities } from '@/lib/disruptions';
import { absoluteUrl, accountsConfigured } from '@/lib/env';
import { formatLongDate } from '@/lib/format';

import {
  deleteAccountAction,
  updatePreferencesAction,
  updateWatchlistAction,
} from './actions';

export const metadata: Metadata = {
  title: 'Your account',
  // A reader's own page has nothing to offer a search engine and should not
  // be in an index even by accident.
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl('/account') },
};

/**
 * The signed-in page.
 *
 * Dynamic, and one of only a handful of routes that are. It reads the session
 * through `cookies()`, so it can never be prerendered — which is precisely why
 * the account surface is confined to this route and `/auth/*` rather than
 * spread across the site.
 */
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!accountsConfigured()) redirect('/alerts');

  const account = await getCurrentAccount();
  if (!account) redirect('/?signin=required');

  const entities = await listEntities();
  const followedEntities = new Set(account.watchlist.entityIds);
  const followedCategories = new Set<string>(account.watchlist.categories);
  const created = formatLongDate(account.createdAt);

  return (
    <>
      <Container width="reading" className="pt-10 sm:pt-14">
        <h1 className="text-title font-semibold text-fg">Your account</h1>
        <p className="mt-4 break-words text-meta text-muted">
          {account.email}
          {created ? ` · joined ${created}` : ''}
        </p>
        <p className="mt-6 max-w-measure text-muted">
          What you follow decides what the register and the exposure chart lead with, and what
          you would be alerted about once{' '}
          <TextLink href="/alerts">the app</TextLink> exists. Nothing is shared, and nothing here
          is used for anything else — see <TextLink href="/privacy">privacy</TextLink>.
        </p>
      </Container>

      <Container width="reading" className="mt-14">
        <h2 className="text-heading font-semibold text-fg">What you follow</h2>

        <form action={updateWatchlistAction} className="mt-6">
          <fieldset className="border-t border-hairline pt-5">
            <legend className="sr-only">Categories</legend>
            <p className="kicker kicker-muted">Kinds of disruption</p>
            <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {DISRUPTION_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg"
                >
                  <input
                    type="checkbox"
                    name="category"
                    value={category}
                    defaultChecked={followedCategories.has(category)}
                    className="size-4 accent-[var(--accent-text)]"
                  />
                  {CATEGORY_LABELS[category]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-8 border-t border-hairline pt-5">
            <legend className="sr-only">Companies and sectors</legend>
            <p className="kicker kicker-muted">Companies and sectors</p>
            {entities.length === 0 ? (
              <p className="mt-3 max-w-measure text-muted">
                Nothing is on the exposure chart yet, so there is no name to follow. Names appear
                as disruptions are assessed — see{' '}
                <TextLink href="/entities">companies and sectors</TextLink>.
              </p>
            ) : (
              <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
                {entities.map((profile) => (
                  <label
                    key={profile.entity.id}
                    className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg"
                  >
                    <input
                      type="checkbox"
                      name="entity"
                      value={profile.entity.id}
                      defaultChecked={followedEntities.has(profile.entity.id)}
                      className="size-4 shrink-0 accent-[var(--accent-text)]"
                    />
                    <span className="min-w-0">
                      {profile.entity.name}
                      {profile.entity.ticker ? (
                        <span className="text-muted"> · {profile.entity.ticker}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <button
            type="submit"
            className="mt-7 inline-flex min-h-11 items-center justify-center border border-accent bg-surface-2 px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link"
          >
            Save what I follow
          </button>
        </form>
      </Container>

      <Container width="reading" className="mt-16">
        <h2 className="text-heading font-semibold text-fg">Alerts</h2>
        <p className="mt-3 max-w-measure text-muted">
          The alerts app is not built yet, so nothing is sent today whatever you choose here. These
          preferences are stored now so they are already correct when it ships — and so that
          nothing is ever switched on for you by default.
        </p>

        <form action={updatePreferencesAction} className="mt-6 border-t border-hairline pt-5">
          <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={account.alerts.enabled}
              className="size-4 accent-[var(--accent-text)]"
            />
            Alert me when the register changes
          </label>

          <label className="mt-2 flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg">
            <input
              type="checkbox"
              name="onlyWatchlist"
              defaultChecked={account.alerts.onlyWatchlist}
              className="size-4 accent-[var(--accent-text)]"
            />
            Only about what I follow
          </label>

          <fieldset className="mt-6">
            <legend className="text-meta text-muted">Not below</legend>
            <div className="mt-2 flex flex-wrap gap-x-8">
              {SEVERITIES.map((severity) => (
                <label
                  key={severity}
                  className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg"
                >
                  <input
                    type="radio"
                    name="minimumSeverity"
                    value={severity}
                    defaultChecked={account.alerts.minimumSeverity === severity}
                    className="size-4 accent-[var(--accent-text)]"
                  />
                  {SEVERITY_LABELS[severity]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-meta text-muted">How</legend>
            <div className="mt-2 flex flex-wrap gap-x-8">
              {(['email', 'push'] as const).map((channel) => (
                <label
                  key={channel}
                  className="flex min-h-11 items-center gap-3 text-[0.9375rem] text-fg"
                >
                  <input
                    type="checkbox"
                    name="channel"
                    value={channel}
                    defaultChecked={account.alerts.channels.includes(channel)}
                    className="size-4 accent-[var(--accent-text)]"
                  />
                  {channel === 'email' ? 'Email' : 'Push, once the app exists'}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-7 inline-flex min-h-11 items-center justify-center border border-accent bg-surface-2 px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link"
          >
            Save alert preferences
          </button>
        </form>
      </Container>

      <Container width="reading" className="mt-16">
        <h2 className="text-heading font-semibold text-fg">Leaving</h2>
        <p className="mt-3 max-w-measure text-muted">
          Deleting removes your account and everything attached to it — your address, what you
          follow, and your alert preferences. It is immediate and cannot be undone. Nothing is
          kept, flagged, or retained in a form that could be restored.
        </p>

        <form action={deleteAccountAction} className="mt-6 border-t border-hairline pt-5">
          <label htmlFor="confirm-delete" className="text-meta text-muted">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            name="confirm"
            type="text"
            autoComplete="off"
            className="mt-2 block min-h-11 w-full max-w-64 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg"
          />
          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 items-center justify-center border border-rule px-5 py-3 text-[0.9375rem] text-muted transition-colors hover:border-status-active hover:text-fg"
          >
            Delete my account
          </button>
        </form>
      </Container>

      <Container width="reading" className="mt-16">
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center text-[0.9375rem] text-link underline decoration-link/35 underline-offset-4 hover:decoration-link"
          >
            Sign out
          </button>
        </form>
      </Container>
    </>
  );
}
