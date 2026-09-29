import { Container } from '@/components/container';
import { TextLink } from '@/components/text-link';

export default function NotFound() {
  return (
    <Container width="reading" className="py-24 sm:py-32">
      <p data-numeric className="text-meta text-muted">
        404
      </p>
      <h1 className="mt-5 text-title font-semibold text-fg">Page not found</h1>
      <p className="mt-5 max-w-measure text-muted">
        There is nothing at this address. It may have been a typo, or a link to something that was
        never published here.
      </p>
      <ul className="mt-6 flex flex-col">
        <li>
          <TextLink href="/" standalone>
            Novus Data home
          </TextLink>
        </li>
        <li>
          <TextLink href="/briefings" standalone>
            The full briefing archive
          </TextLink>
        </li>
      </ul>
    </Container>
  );
}
