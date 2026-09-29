import { postCardImage } from '@/components/post-card-image';
import { publication } from '@/config/publication';
import { POST_KIND_LABELS, getArticle, listArticleSlugs } from '@/lib/content';
import { formatLongDate } from '@/lib/format';
import { ogSize } from '@/lib/og';

export const alt = `An article from ${publication.name}`;
export const size = ogSize;
export const contentType = 'image/png';

/** One card per article or review, generated at build time alongside the page. */
export async function generateStaticParams() {
  const slugs = await listArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ArticleOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getArticle(slug);

  return postCardImage({
    title: issue?.title ?? publication.name,
    label: issue ? POST_KIND_LABELS[issue.kind] : null,
    date: formatLongDate(issue?.publishedAt),
  });
}
