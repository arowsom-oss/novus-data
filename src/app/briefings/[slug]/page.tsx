import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostPage, postMetadata } from '@/components/post-page';
import { getIssue, getIssueNeighbours, listIssueSlugs } from '@/lib/content';

/**
 * Every issue is a file in this repository, so the full slug list is known at
 * build time and every issue page is prerendered. A build with no network
 * access still produces the complete site.
 */
export async function generateStaticParams() {
  const slugs = await listIssueSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** An unknown slug is a 404, not an empty article shell. */
export const dynamicParams = false;

export async function generateMetadata(props: PageProps<'/briefings/[slug]'>): Promise<Metadata> {
  const issue = await getIssue((await props.params).slug);
  return issue ? postMetadata(issue) : { title: 'Briefing not found' };
}

export default async function IssuePage(props: PageProps<'/briefings/[slug]'>) {
  const { slug } = await props.params;
  const issue = await getIssue(slug);
  if (!issue) notFound();

  return <PostPage post={issue} {...await getIssueNeighbours(slug)} />;
}
