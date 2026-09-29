import { postCardImage } from '@/components/post-card-image';
import { publication } from '@/config/publication';
import { getIssue, listIssueSlugs } from '@/lib/content';
import { formatIssueLabel, formatLongDate } from '@/lib/format';
import { ogSize } from '@/lib/og';

export const alt = `A briefing from ${publication.name}`;
export const size = ogSize;
export const contentType = 'image/png';

/** One card per issue, generated at build time alongside the page. */
export async function generateStaticParams() {
  const slugs = await listIssueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function IssueOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  const number = formatIssueLabel(issue?.issueNumber ?? null);

  return postCardImage({
    title: issue?.title ?? publication.name,
    label: number ? `Issue ${number}` : null,
    date: formatLongDate(issue?.publishedAt),
  });
}
