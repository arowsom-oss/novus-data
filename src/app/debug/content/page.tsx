import { notFound } from 'next/navigation';

import { Container } from '@/components/container';
import { INPUT_LEDGER, missingLaunchInputs } from '@/config/input-ledger';
import { getContentSourceName } from '@/lib/content';
import { readDiagnostics } from '@/lib/content/sources/local-files';
import { readDisruptionDiagnostics } from '@/lib/disruptions/sources/local-files';
import { env } from '@/lib/env';

/**
 * Development-only inspection route.
 *
 * This stands in for a test framework. The place a bug is actually likely in
 * this project is a malformed issue file, and this page makes that visible in
 * one look: which files were found, which parsed, which have a usable date,
 * and every warning the content layer raised. It also shows which Section 0
 * inputs are still unanswered.
 *
 * It returns 404 in any non-development build.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function DebugContentPage() {
  if (!env.isDevelopment) notFound();

  const diagnostics = await readDiagnostics();
  const register = await readDisruptionDiagnostics();
  const missing = missingLaunchInputs();

  return (
    <Container className="py-14">
      <h1 className="text-title font-semibold text-fg">Content diagnostics</h1>
      <p className="mt-3 text-muted">
        Development only. Active source: <code>{getContentSourceName()}</code>. Reading{' '}
        <code>{diagnostics.directory}</code> — {diagnostics.fileCount} file
        {diagnostics.fileCount === 1 ? '' : 's'} found, {diagnostics.issues.length} parsed.
      </p>

      <Block title={`Warnings (${diagnostics.warnings.length})`}>
        {diagnostics.warnings.length === 0 ? (
          <p className="text-muted">None.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {diagnostics.warnings.map((warning) => (
              <li key={warning} className="border-l-2 border-accent pl-3 text-muted">
                {warning}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={`Issues (${diagnostics.issues.length})`}>
        {diagnostics.issues.length === 0 ? (
          <p className="text-muted">
            No issues parsed. The site renders its pre-launch state — that is not an error.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-meta">
              <thead>
                <tr className="border-b border-rule text-muted">
                  <Th>File</Th>
                  <Th>Slug</Th>
                  <Th>No.</Th>
                  <Th>publishedAt</Th>
                  <Th>Date ok</Th>
                  <Th>Excerpt</Th>
                  <Th>Body chars</Th>
                  <Th>Words</Th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.issues.map((issue) => (
                  <tr key={issue.file} className="border-b border-hairline align-top">
                    <Td>{issue.file}</Td>
                    <Td>{issue.slug}</Td>
                    <Td numeric>{issue.issueNumber ?? '—'}</Td>
                    <Td>{issue.publishedAt || '—'}</Td>
                    <Td>{issue.dateParsed ? 'yes' : 'NO'}</Td>
                    <Td>{issue.hasExcerpt ? 'yes' : 'no'}</Td>
                    <Td numeric>{issue.bodyLength}</Td>
                    <Td numeric>{issue.words}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block title={`Register warnings (${register.warnings.length})`}>
        <p className="mb-3 text-muted">
          Reading <code>{register.directory}</code> — {register.fileCount} file
          {register.fileCount === 1 ? '' : 's'}, {register.entries.length} parsed. Every warning
          here is a claim the site refused to publish.
        </p>
        {register.warnings.length === 0 ? (
          <p className="text-muted">None.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {register.warnings.map((warning) => (
              <li key={warning} className="border-l-2 border-accent pl-3 text-muted">
                {warning}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={`Disruptions (${register.entries.length})`}>
        {register.entries.length === 0 ? (
          <p className="text-muted">Register empty.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left text-meta">
              <thead>
                <tr className="border-b border-rule text-muted">
                  <Th>File</Th>
                  <Th>Id</Th>
                  <Th>Status</Th>
                  <Th>Reviewed</Th>
                  <Th>Date ok</Th>
                  <Th>Sources</Th>
                  <Th>Exposures</Th>
                  <Th>Body chars</Th>
                </tr>
              </thead>
              <tbody>
                {register.entries.map((entry) => (
                  <tr key={entry.file} className="border-b border-hairline align-top">
                    <Td>{entry.file}</Td>
                    <Td>{entry.id}</Td>
                    <Td>{entry.status}</Td>
                    <Td>{entry.updatedAt}</Td>
                    <Td>{entry.dateParsed ? 'yes' : 'NO'}</Td>
                    <Td numeric>{entry.sourceCount}</Td>
                    <Td numeric>{entry.exposureCount}</Td>
                    <Td numeric>{entry.bodyLength}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block title={`Blocking a production build (${missing.length})`}>
        {missing.length === 0 ? (
          <p className="text-muted">Nothing. A production build would succeed.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {missing.map((record) => (
              <li key={record.key} className="border-l-2 border-accent pl-3">
                <code className="text-fg">{record.key}</code>
                <p className="mt-1 text-muted">{record.note}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Input ledger">
        <ul className="flex flex-col gap-4">
          {INPUT_LEDGER.map((record) => (
            <li key={record.key} className="border-t border-hairline pt-3">
              <p>
                <code className="text-fg">{record.key}</code>{' '}
                <span className="text-meta text-muted">[{record.provenance}]</span>
              </p>
              <p className="mt-1 text-muted">{record.note}</p>
              <p className="mt-1 text-meta text-muted">Used on: {record.usedOn.join(', ')}</p>
            </li>
          ))}
        </ul>
      </Block>
    </Container>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-heading font-semibold text-fg">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 font-normal">{children}</th>;
}

function Td({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <td className="px-2 py-2 text-muted" {...(numeric ? { 'data-numeric': true } : {})}>
      {children}
    </td>
  );
}
