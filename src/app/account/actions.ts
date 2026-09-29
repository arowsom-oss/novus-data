'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAccountRepository } from '@/lib/accounts';
import { getCurrentAccountId } from '@/lib/accounts/session';
import { DEFAULT_ALERT_PREFERENCES, type AlertChannel } from '@/lib/accounts/types';
import { DISRUPTION_CATEGORIES, ID_PATTERN, SEVERITIES } from '@/lib/disruptions/types';
import type { DisruptionCategory, Severity } from '@/lib/disruptions/types';

/**
 * Server actions for the account page.
 *
 * Every one of these re-derives the reader's id from the session rather than
 * accepting it from the form. A server action is a public endpoint — anyone
 * can post to it — so an id arriving in the payload would let a caller edit
 * somebody else's watchlist. Row-level security would still refuse the write,
 * but the check belongs here too: defence in depth, and a clearer failure.
 */

async function requireAccountId(): Promise<string> {
  const id = await getCurrentAccountId();
  if (!id) redirect('/?signin=required');
  return id;
}

/**
 * How many names one reader may follow.
 *
 * A server action is a public endpoint, as the note above says, and the form
 * is not the only thing that can post to it. Validating each value's shape is
 * not enough on its own: nothing stopped a caller posting a hundred thousand
 * well-formed slugs, all of which passed the regex and all of which were
 * written to the row. Row-level security confines the damage to the caller's
 * own record, so this is storage abuse rather than a breach — but an unbounded
 * write from an open endpoint should be bounded at the endpoint.
 *
 * The limit is far above any real watchlist and is not presented in the UI,
 * because a reader using the page cannot reach it: the form only offers the
 * entities that exist.
 */
const MAX_WATCHLIST_ENTRIES = 500;

export async function updateWatchlistAction(formData: FormData) {
  const id = await requireAccountId();

  // Values come from a form, so they are strings of unknown provenance until
  // checked against the register's own vocabulary. Deduplicated as well as
  // checked: posting the same id a thousand times stored it a thousand times.
  const categories = [
    ...new Set(
      formData
        .getAll('category')
        .filter((value): value is string => typeof value === 'string')
        .filter((value): value is DisruptionCategory =>
          (DISRUPTION_CATEGORIES as string[]).includes(value),
        ),
    ),
  ];

  const entityIds = [
    ...new Set(
      formData
        .getAll('entity')
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => ID_PATTERN.test(value)),
    ),
  ].slice(0, MAX_WATCHLIST_ENTRIES);

  const repository = await getAccountRepository();
  await repository.updateWatchlist(id, { entityIds, categories });

  revalidatePath('/account');
}

export async function updatePreferencesAction(formData: FormData) {
  const id = await requireAccountId();

  const severity = formData.get('minimumSeverity');
  const minimumSeverity: Severity =
    typeof severity === 'string' && (SEVERITIES as string[]).includes(severity)
      ? (severity as Severity)
      : DEFAULT_ALERT_PREFERENCES.minimumSeverity;

  const channels = formData
    .getAll('channel')
    .filter((value): value is AlertChannel => value === 'email' || value === 'push');

  const repository = await getAccountRepository();
  await repository.updatePreferences(id, {
    enabled: formData.get('enabled') === 'on',
    channels,
    minimumSeverity,
    onlyWatchlist: formData.get('onlyWatchlist') === 'on',
  });

  revalidatePath('/account');
}

/**
 * Deletion. Irreversible, and it removes the identity as well as the
 * preferences — see rule 4 in src/lib/accounts/types.ts.
 *
 * Guarded by a typed confirmation rather than a checkbox: this is the one
 * action on the site that cannot be undone, and it should be harder to do by
 * accident than to do on purpose.
 */
export async function deleteAccountAction(formData: FormData) {
  const id = await requireAccountId();

  if (formData.get('confirm') !== 'DELETE') {
    redirect('/account?delete=unconfirmed');
  }

  const repository = await getAccountRepository();
  await repository.deleteAccount(id);

  // The session outlives the identity by a moment; clear it so the reader is
  // not left holding a cookie for a user that no longer exists.
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  await (await createSupabaseServerClient()).auth.signOut();

  redirect('/?deleted=1');
}
