'use client';

/**
 * The root error boundary. It replaces the whole document, so it cannot use
 * the site layout, the fonts or the Tailwind theme — the styles here are
 * inline on purpose, and use the brand hex values directly rather than tokens
 * that may not have loaded.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#070c20',
          color: '#f4f6fa',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: '34rem', margin: '0 auto', padding: '3rem 1.25rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
            Novus Data could not load
          </h1>
          <p style={{ color: '#9395a0', lineHeight: 1.65, marginTop: '1.25rem' }}>
            Something went wrong before the page could be built. Reloading usually fixes it.
          </p>
          <p style={{ marginTop: '1.75rem' }}>
            {/* A plain anchor on purpose. This boundary replaces the whole
                document, which means the React tree and the client router may
                both be broken; a full page load is the only reliable way out.
                eslint-disable-next-line @next/next/no-html-link-for-pages */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: '#7b92be' }}>
              Go to the home page
            </a>
          </p>
          {error.digest ? (
            <p style={{ color: '#9395a0', fontSize: '0.8125rem', marginTop: '2.5rem' }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
