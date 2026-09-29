import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostPage, postMetadata } from '@/components/post-page';
import { getArticle, getArticleNeighbours, listArticleSlugs } from '@/lib/content';

/**
 * An article or long-term review — the same reading page as a briefing, with
 * the kind named above the title instead of an issue number.
 *
 * Every post is a file in this repository, so every page is prerendered and a
 * build with no network access still produces the complete site.
 */
export async function generateStaticParams() {
  const slugs = await listArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** An unknown slug is a 404, not an empty article shell. */
export const dynamicParams = false;

export async function generateMetadata(props: PageProps<'/articles/[slug]'>): Promise<Metadata> {
  const issue = await getArticle((await props.params).slug);
  return issue ? postMetadata(issue) : { title: 'Article not found' };
}

export default async function ArticlePage(props: PageProps<'/articles/[slug]'>) {
  const { slug } = await props.params;
  const issue = await getArticle(slug);
  if (!issue) notFound();

  return <PostPage post={issue} {...await getArticleNeighbours(slug)} />;
}
