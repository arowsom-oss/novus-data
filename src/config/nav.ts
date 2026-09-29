/**
 * Site navigation. The header, the mobile menu, the footer and the sitemap all
 * read from here, so adding a section to the site is one edit.
 *
 * Order is deliberate: the register and the exposure chart are what the site is
 * for, so they lead. The email briefing is one part of the site rather than the
 * whole of it, and sits after them.
 */

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Shown in the header and the mobile menu.
 *
 * Home leads and is named explicitly. The wordmark also links to `/`, which is
 * the web's oldest convention, but a convention is not an affordance: a reader
 * who is three pages deep should not have to know it. Both routes home now
 * exist, and the labelled one costs a single nav item.
 */
export const primaryNav: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/disruptions', label: 'Disruptions' },
  { href: '/exposure', label: 'Exposure' },
  // The live page. In the header rather than the footer because it is the one
  // page that is different every time it is opened — which is the reason a
  // reader comes back, and so the reason it has to be one click away.
  { href: '/monitor', label: 'Monitor' },
  { href: '/articles', label: 'Articles' },
  { href: '/briefings', label: 'Briefings' },
  { href: '/about', label: 'About' },
];

/** Shown in the footer. A superset of the primary navigation. */
export const footerNav: NavItem[] = [
  ...primaryNav,
  // Not in the header: the entity index is reached from the chart, which is
  // where a reader is when the question "what about this name" occurs to them.
  // A sixth header item to reach a seventh page would cost more than it earns.
  { href: '/entities', label: 'Companies' },
  // Out of the header since Articles arrived: a page describing an app that
  // does not exist yet earns less header room than published writing.
  { href: '/alerts', label: 'Alerts' },
  { href: '/coverage', label: 'Coverage' },
  { href: '/subscribe', label: 'Subscribe' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
];
