import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { ExternalLink, TextLink } from '@/components/text-link';
import { publication } from '@/config/publication';
import { absoluteUrl, accountsConfigured, env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Privacy',
  description: `What ${publication.name} does and does not collect.`,
  alternates: { canonical: absoluteUrl('/privacy') },
};

/*
 * TODO (must be reviewed by the publisher before the custom domain goes live):
 * This page is a plain description of how the site actually behaves today. It
 * is deliberately not drafted as a legal privacy policy, and it has not been
 * reviewed by anyone qualified to write one. If analytics, embeds, a comment
 * system or any third-party script is ever added, this page stops being
 * accurate the moment that change ships. See HANDOFF.md.
 */
export default function PrivacyPage() {
  // The page describes what this deployment actually does. With no account
  // store configured there is genuinely nothing held, and saying otherwise
  // would be its own kind of inaccuracy.
  const accounts = accountsConfigured();

  return (
    <>
      <PageHeader
        title="Privacy"
        lede="What this site does with information, described plainly."
      />

      <Container width="reading" className="mt-12 flex flex-col gap-10">
        <Section heading="This site">
          <p>
            The pages you read — the register, the exposure chart, the monitor, the company and
            sector pages and the briefing archive — are served as pre-built files. They run no
            analytics, embed no tracking pixels and load no third-party scripts. Nothing you do
            while reading is recorded by Novus Data.
          </p>
          <p>
            The monitor is rebuilt on the server every fifteen minutes from public data feeds.
            Your browser never contacts those feeds, so none of them learns anything about you.
            While the monitor is open, it asks this site — and only this site — for a newer copy
            every five minutes. Headlines on it link to other publishers&rsquo; websites, which
            have their own privacy terms once you follow a link.
          </p>
          {accounts ? (
            <p>
              One cookie exists, and only after you sign in: a session cookie set by Supabase, the
              service that handles sign-in. It is what keeps you signed in between pages. It is
              not used to track reading, it is not shared, and signing out removes it. If you
              never sign in, the site sets no cookie at all.
            </p>
          ) : null}
          <p>
            The site is hosted on Vercel, which keeps standard server logs of requests, including
            IP addresses, in the ordinary course of serving a website. Novus Data does not read
            those logs to identify readers.
          </p>
        </Section>

        {accounts ? (
          <Section heading="If you create an account">
            <p>
              Accounts are optional. Everything on this site is free to read without one, and
              nothing is withheld from readers who do not have one.
            </p>
            <p>
              <strong className="font-medium text-fg">There is no password.</strong> Signing in
              works by emailed link: you enter an address, we email a one-time link, and clicking
              it signs you in. No password is ever chosen, typed, transmitted or stored — so there
              is no password here to be stolen or reused.
            </p>
            <p>What is held, in full:</p>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              <li>
                <strong className="font-medium text-fg">Your email address</strong>, because
                signing in and any future alert has to reach you somewhere.
              </li>
              <li>
                <strong className="font-medium text-fg">The companies, sectors and categories
                you follow</strong>, because that is the point of having an account.
              </li>
              <li>
                <strong className="font-medium text-fg">Your alert preferences</strong> — whether
                alerts are on, how severe a problem has to be, and which channels.
              </li>
              <li>
                <strong className="font-medium text-fg">The date you joined.</strong>
              </li>
            </ul>
            <p>
              That is the whole list. No name is required. No IP address, device, browser or
              reading history is attached to your account. What you follow is not used to profile
              you, is not sold, and is not shared with anyone.
            </p>
            <p>
              This data lives in a Supabase database, which provides the sign-in and the storage.
              Supabase can technically reach the data it stores, as any database provider can.
            </p>
            <p>
              <ExternalLink standalone href="https://supabase.com/privacy">
                Supabase&rsquo;s privacy policy
              </ExternalLink>
            </p>
            <p>
              <strong className="font-medium text-fg">Deleting is immediate and complete.</strong>{' '}
              There is a delete button on your account page. It removes your address, what you
              follow and your preferences at once. Nothing is soft-deleted, archived or kept in a
              form that could be restored, and you do not have to email anyone to ask.
            </p>
          </Section>
        ) : (
          <Section heading="The sign-in form">
            <p>
              There is a sign-in panel on the home page. It does nothing on this deployment: no
              account store is configured, it makes no network request, and anything typed into it
              stays in your browser and is discarded when you leave the page.
            </p>
            <p>
              It exists so the signed-in experience can be designed before it is switched on. When
              accounts are live, this page describes exactly what is held and why — in the same
              release, not afterwards.
            </p>
          </Section>
        )}

        <Section heading="Subscribing">
          <p>
            Subscribing happens on Beehiiv, not here. When you subscribe, your email address goes
            to Beehiiv, which sends the newsletter, stores the subscriber list and handles
            unsubscribes. Beehiiv&rsquo;s privacy policy governs what happens to it from that
            point, and its terms are between you and Beehiiv.
          </p>
          <p>
            <ExternalLink standalone href="https://www.beehiiv.com/privacy">
              Beehiiv&rsquo;s privacy policy
            </ExternalLink>
          </p>
          <p>Every issue includes an unsubscribe link. Unsubscribing removes you from the list.</p>
        </Section>

        <Section heading="Email you send">
          {env.contactEmail ? (
            <p>
              If you email {publication.name}, that message and your address sit in an ordinary
              email account. They are not added to the subscriber list, and they are not shared.
            </p>
          ) : (
            <p>
              No contact address is published yet. When one is, mail sent to it will sit in an
              ordinary email account and will not be added to the subscriber list.
            </p>
          )}
        </Section>

        <Section heading="Changes">
          <p>
            If this site ever adds analytics, an embedded form or anything else that collects
            information, this page will be updated before that change goes live. That rule already
            applied once: this section was rewritten in the same release that made accounts
            possible, rather than after it.
          </p>
          <p>
            Questions about any of this can go to{' '}
            <TextLink href="/contact">the contact page</TextLink>.
          </p>
        </Section>
      </Container>
    </>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-heading font-semibold text-fg">{heading}</h2>
      <div className="mt-4 flex max-w-measure flex-col gap-4 text-muted">{children}</div>
    </section>
  );
}
