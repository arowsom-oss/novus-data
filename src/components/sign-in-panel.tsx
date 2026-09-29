'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

/**
 * The account panel on the home page.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO PASSWORD FIELD HERE, AND THERE MUST NEVER BE ONE.
 *
 * Sign-in is a magic link: the reader types an address, Supabase emails a
 * one-time link, clicking it creates the session. No password is chosen,
 * typed, transmitted, hashed or stored at any point — which means there is no
 * password to leak, to reuse, or to get wrong. It also matches the account
 * contract, which has structurally nowhere to put a secret.
 *
 * The earlier version of this file had a password input because it was a
 * non-functional shell. Adding one back would be a regression, not a feature.
 * ---------------------------------------------------------------------------
 *
 * Two states, decided on the server by `accountsConfigured()` and passed in,
 * because ACCOUNT_STORE is not a NEXT_PUBLIC_ value and cannot be read here:
 *
 *   enabled = false  the pre-launch panel. Sends nothing anywhere and says so
 *                    before and after a submit attempt, so nobody can type an
 *                    address believing it went somewhere.
 *   enabled = true   the real flow.
 *
 * The signed-in check runs after mount rather than on the server on purpose:
 * reading the session server-side would make the home page dynamic, and the
 * home page is the one that most deserves to stay prerendered. A signed-in
 * reader sees the form for a moment before it swaps. That is the trade.
 */

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function SignInPanel({ enabled = false }: { enabled?: boolean }) {
  const headingId = useId();
  const emailId = useId();
  const noticeId = useId();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  // Derived, not set in the effect: with accounts off there is nothing to
  // check, and calling setState synchronously inside an effect cascades.
  const [checked, setChecked] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const { data } = await createSupabaseBrowserClient().auth.getUser();
        if (!cancelled) setSignedInAs(data.user?.email ?? null);
      } catch {
        // Not configured, offline, or blocked. The form is the correct
        // fallback — it is what a signed-out reader would see anyway.
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  async function requestLink(event: React.FormEvent) {
    event.preventDefault();

    if (!enabled) {
      setStatus('sent');
      setMessage('Accounts are not open yet, so nothing was sent. Nothing you typed left this page.');
      return;
    }

    setStatus('sending');
    try {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;

      // Deliberately the same message whether or not an account exists. Saying
      // "no account found" would let anyone check which addresses are
      // registered, one guess at a time.
      setStatus('sent');
      setMessage('Check your email. If that address can sign in, a link is on its way.');
    } catch {
      setStatus('error');
      setMessage('That did not send. Try again in a moment.');
    }
  }

  if (enabled && checked && signedInAs) {
    return (
      <section
        aria-labelledby={headingId}
        className="border border-hairline bg-surface p-7 sm:p-8"
      >
        <h2 id={headingId} className="text-heading font-semibold text-fg">
          Signed in
        </h2>
        <p className="mt-2 break-words text-meta text-muted">{signedInAs}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center border border-accent bg-surface-2 px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link"
          >
            Your account
          </Link>
          {/* A POST, because a GET would let any prefetch sign someone out. */}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center text-[0.9375rem] text-link underline decoration-link/35 underline-offset-4 hover:decoration-link"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="border border-hairline bg-surface p-7 sm:p-8">
      <h2 id={headingId} className="text-heading font-semibold text-fg">
        Sign in
      </h2>
      <p className="mt-2 text-meta text-muted">
        {enabled
          ? 'We email you a link. There is no password to choose or remember.'
          : 'Accounts are not open yet. Everything on Novus Data is free to read without one.'}
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={requestLink}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-meta text-muted">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required={enabled}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete={enabled ? 'email' : 'off'}
            placeholder="you@example.com"
            className="min-h-11 border border-rule bg-ink px-3 py-2 text-[0.9375rem] text-fg placeholder:text-muted/70"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          aria-describedby={message ? noticeId : undefined}
          className="mt-1 inline-flex min-h-11 items-center justify-center border border-accent bg-surface-2 px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : enabled ? 'Email me a link' : 'Sign in'}
        </button>

        <p id={noticeId} role="status" className="min-h-[1.25rem] text-meta text-muted">
          {message}
        </p>
      </form>

      <p className="mt-2 border-t border-hairline pt-4 text-meta text-muted">
        {enabled
          ? 'An account saves the companies and sectors you follow, so the register and the exposure chart lead with what reaches you.'
          : 'When accounts open they will save the companies and lanes you follow, so the register and the exposure chart lead with what reaches you.'}
      </p>
    </section>
  );
}
