import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session refresh.
 *
 * **This file is `proxy.ts`, not `middleware.ts`.** Next 16 renamed the
 * convention; `middleware.ts` is deprecated and every Supabase guide still
 * shows the old name. Do not "correct" it back.
 *
 * Supabase access tokens are short-lived. Without something refreshing them on
 * each request, a reader is silently signed out mid-session and server
 * components see no user. This runs before the request completes, refreshes
 * the token if it is due, and writes the rotated cookies onto the response.
 *
 * It is deliberately the only thing happening here. Next's own guidance is
 * that this layer is for optimistic checks, not authorisation — the real check
 * is `getUser()` in the route that needs it, which revalidates against
 * Supabase rather than trusting a cookie.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No project configured: the site has no accounts, so there is no session to
  // refresh and every request passes straight through.
  if (process.env.ACCOUNT_STORE !== 'supabase' || !url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  /**
   * Everything except static assets, feeds and the generated image routes. The
   * register, chart, entity and briefing pages still serve their prerendered
   * HTML — this only rotates a cookie alongside it.
   *
   * The image and feed exclusions are anchored with `.*` on the front on
   * purpose. Written as a bare alternation they only matched at the start of
   * the path, so `/opengraph-image` was excluded but
   * `/disruptions/<id>/opengraph-image` was not — and every per-entry social
   * card is nested. The effect was one `getUser()` round-trip to Supabase per
   * card fetch, from Slack, LinkedIn and every other unfurler, none of which
   * carry a cookie. Wasted latency and wasted auth traffic on the routes least
   * able to benefit from a session, and invisible until accounts are switched
   * on.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|register.json|live.json|feed.json|(?:.*/)?(?:icon|apple-icon|opengraph-image|twitter-image)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
