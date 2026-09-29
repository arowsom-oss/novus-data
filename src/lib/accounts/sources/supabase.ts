/**
 * The Supabase-backed `AccountRepository`.
 *
 * Maps the contract in ../types.ts onto four tables. Identity itself lives in
 * `auth.users`, which Supabase owns — this layer never reads or writes a
 * credential, and there is still nowhere in the types to put one.
 *
 *   auth.users            id, email          ← Supabase's. Not ours to touch.
 *   profiles              display_name, created_at
 *   watchlist_entities    (user_id, entity_id)
 *   watchlist_categories  (user_id, category)
 *   alert_preferences     enabled, channels, minimum_severity, only_watchlist
 *
 * Every read here goes through the request-scoped client, so row-level
 * security applies: a reader can only ever reach their own rows, enforced by
 * the database rather than by this code being careful. The schema and the
 * policies are in DEPLOY.md Part 4.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { DisruptionCategory, Severity } from '@/lib/disruptions/types';
import {
  DEFAULT_ALERT_PREFERENCES,
  looksLikeEmail,
  normaliseEmail,
  type Account,
  type AccountId,
  type AccountRepository,
  type AlertChannel,
  type AlertPreferences,
  type NewAccount,
  type Watchlist,
} from '../types';

interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

interface PreferencesRow {
  enabled: boolean;
  channels: string[] | null;
  minimum_severity: string;
  only_watchlist: boolean;
}

/**
 * Values arriving from the database are `unknown` in the way any external
 * input is: the column is text, and a hand-edited row could hold anything.
 * These narrow rather than cast, falling back to the documented default.
 */
function toSeverity(value: string | null | undefined): Severity {
  return value === 'low' || value === 'moderate' || value === 'high'
    ? value
    : DEFAULT_ALERT_PREFERENCES.minimumSeverity;
}

function toChannels(values: string[] | null | undefined): AlertChannel[] {
  if (!values) return [];
  return values.filter((value): value is AlertChannel => value === 'email' || value === 'push');
}

export function createSupabaseAccountRepository(
  client: SupabaseClient,
  /**
   * Deleting from `auth.users` needs the service role, which the request
   * client does not have. Injected rather than imported so that this module
   * never pulls the admin client — and its key — into a graph that does not
   * need it.
   */
  adminClientFactory?: () => SupabaseClient,
): AccountRepository {
  async function assemble(profile: ProfileRow, email: string): Promise<Account> {
    const [entities, categories, preferences] = await Promise.all([
      client.from('watchlist_entities').select('entity_id').eq('user_id', profile.id),
      client.from('watchlist_categories').select('category').eq('user_id', profile.id),
      client
        .from('alert_preferences')
        .select('enabled, channels, minimum_severity, only_watchlist')
        .eq('user_id', profile.id)
        .maybeSingle<PreferencesRow>(),
    ]);

    const alerts: AlertPreferences = preferences.data
      ? {
          enabled: preferences.data.enabled,
          channels: toChannels(preferences.data.channels),
          minimumSeverity: toSeverity(preferences.data.minimum_severity),
          onlyWatchlist: preferences.data.only_watchlist,
        }
      : // No row yet — the signup trigger creates one, but a reader who
        // predates the trigger must still get a coherent account rather than
        // an error. Defaults are off, which is the safe direction.
        { ...DEFAULT_ALERT_PREFERENCES, channels: [] };

    return {
      id: profile.id,
      email,
      displayName: profile.display_name,
      createdAt: profile.created_at,
      watchlist: {
        entityIds: (entities.data ?? []).map((row) => row.entity_id),
        categories: (categories.data ?? []).map((row) => row.category as DisruptionCategory),
      },
      alerts,
    };
  }

  async function emailFor(id: AccountId): Promise<string> {
    // The address lives on auth.users, which is reachable for the signed-in
    // reader through the session rather than by querying the table.
    const { data } = await client.auth.getUser();
    return data.user?.id === id ? (data.user.email ?? '') : '';
  }

  return {
    async findById(id) {
      const [{ data, error }, email] = await Promise.all([
        client.from('profiles').select('id, display_name, created_at').eq('id', id).maybeSingle<ProfileRow>(),
        emailFor(id),
      ]);

      // Not-found and not-permitted are indistinguishable under RLS, and that
      // is the correct behaviour: it means one reader cannot probe for the
      // existence of another's account.
      if (error || !data) return null;
      return assemble(data, email);
    },

    async findByEmail(email) {
      const normalised = normaliseEmail(email);
      const { data } = await client.auth.getUser();
      // Lookup by address is only ever the signed-in reader's own. There is
      // deliberately no way to ask this system whether an arbitrary address
      // has an account — that is an enumeration hole, and the sign-in flow
      // does not need one.
      if (!data.user || normaliseEmail(data.user.email ?? '') !== normalised) return null;
      return this.findById(data.user.id);
    },

    async create(input: NewAccount) {
      const email = normaliseEmail(input.email);
      if (!looksLikeEmail(email)) {
        throw new Error(`Creating an account: "${input.email}" is not a usable email address.`);
      }

      // Normally redundant: a Postgres trigger on auth.users creates these
      // rows at signup, so this is the self-healing path for an identity that
      // predates the trigger. Both upserts are idempotent.
      const displayName = input.displayName?.trim();
      const { error } = await client.from('profiles').upsert(
        {
          id: input.id,
          display_name: displayName && displayName.length > 0 ? displayName : null,
        },
        { onConflict: 'id', ignoreDuplicates: false },
      );
      if (error) throw new Error(`Creating an account: ${error.message}`);

      await client
        .from('alert_preferences')
        .upsert({ user_id: input.id }, { onConflict: 'user_id', ignoreDuplicates: true });

      const account = await this.findById(input.id);
      if (!account) throw new Error('Creating an account: the row was not readable after write.');
      return account;
    },

    async updateWatchlist(id: AccountId, watchlist: Watchlist) {
      const entityIds = [...new Set(watchlist.entityIds.map((v) => v.trim()).filter(Boolean))];
      const categories = [...new Set(watchlist.categories)];

      // Replace rather than diff. The set is small, the write is scoped to one
      // user by RLS, and a diff would be more code and more ways to be wrong.
      await client.from('watchlist_entities').delete().eq('user_id', id);
      await client.from('watchlist_categories').delete().eq('user_id', id);

      if (entityIds.length > 0) {
        const { error } = await client
          .from('watchlist_entities')
          .insert(entityIds.map((entityId) => ({ user_id: id, entity_id: entityId })));
        if (error) throw new Error(`Updating a watchlist: ${error.message}`);
      }
      if (categories.length > 0) {
        const { error } = await client
          .from('watchlist_categories')
          .insert(categories.map((category) => ({ user_id: id, category })));
        if (error) throw new Error(`Updating a watchlist: ${error.message}`);
      }

      return this.findById(id);
    },

    async updatePreferences(id: AccountId, preferences: AlertPreferences) {
      const { error } = await client.from('alert_preferences').upsert(
        {
          user_id: id,
          enabled: preferences.enabled,
          channels: [...new Set(preferences.channels)],
          minimum_severity: preferences.minimumSeverity,
          only_watchlist: preferences.onlyWatchlist,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw new Error(`Updating alert preferences: ${error.message}`);
      return this.findById(id);
    },

    async deleteAccount(id: AccountId) {
      if (!adminClientFactory) {
        throw new Error(
          'Deleting an account needs the service role client, which was not provided. ' +
            'Removing a row from auth.users cannot be done with the anon key.',
        );
      }

      // The profile row and everything keyed to it go via ON DELETE CASCADE,
      // so this single call removes the identity and all of its data. Nothing
      // is flagged or soft-deleted — see rule 4 in ../types.ts.
      const { error } = await adminClientFactory().auth.admin.deleteUser(id);
      if (error) {
        if (error.status === 404) return false;
        throw new Error(`Deleting an account: ${error.message}`);
      }
      return true;
    },
  };
}
