'use client';

import { useEffect } from 'react';

import { Container } from '@/components/container';
import { TextLink } from '@/components/text-link';

/**
 * Route-level error boundary. It states what happened in plain language and
 * offers a way back. No stack trace reaches the reader — the digest is enough
 * to find the real error in the server logs.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container width="reading" className="py-24 sm:py-32">
      <h1 className="text-title font-semibold text-fg">This page did not load</h1>
      <p className="mt-5 max-w-measure text-muted">
        Something went wrong while rendering this page. It is a fault at this end, not with your
        browser.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[2.875rem] items-center border border-accent bg-surface px-5 py-3 text-[0.9375rem] font-medium text-fg transition-colors hover:border-link hover:bg-surface-2"
        >
          Try again
        </button>
        <TextLink href="/">Go to the home page</TextLink>
      </div>
      {error.digest ? (
        <p data-numeric className="mt-10 text-meta text-muted">
          Reference {error.digest}
        </p>
      ) : null}
    </Container>
  );
}
