// The one project row (D-02, D-03): the landing page, the unknown-project page and (08-11) the header
// switcher all render it. Everything shown comes from the server's list entry; the client never
// guesses a home folder or a project's state. Names, paths and reasons are React text nodes only
// (T-08-22). The row is the 040 winner's arrangement: name over path on the left, load mark over
// last-opened time on the right, an unavailable project's reason on its own line below.
import { Check, Folder, Loader, Server } from 'lucide-react';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { AppLink } from '../nav.tsx';
import { projectRootPath } from '../project-path.ts';

export function ProjectRow({
  entry,
  variant,
  current = false,
}: {
  entry: ProjectListEntry;
  /** `landing` adds the last-opened time; `switcher` is the compact popup row. */
  variant: 'switcher' | 'landing';
  /** True for the project whose slug is in the address (never on the landing page). */
  current?: boolean;
  now?: number;
}): React.JSX.Element {
  const PathIcon = entry.kind === 'ssh' ? Server : Folder;
  return (
    <li
      className="project-row"
      data-variant={variant}
      data-current={current ? 'true' : undefined}
      aria-current={current ? 'true' : undefined}
    >
      <AppLink className="project-row-name" to={projectRootPath(entry.slug)}>
        {entry.name}
      </AppLink>
      {current ? (
        <>
          <Check aria-hidden="true" />
          <span className="sr-only">Current</span>
        </>
      ) : null}
      {entry.state === 'loading' ? (
        <span className="status-chip" data-tone="quiet">
          <Loader aria-hidden="true" />
          Opening…
        </span>
      ) : null}
      {entry.state === 'unavailable' ? (
        <>
          <span className="status-chip" data-tone="missing">
            Unavailable
          </span>
          {entry.reason ? <p className="source-note">{entry.reason}</p> : null}
        </>
      ) : null}
      <span className="project-row-path" title={entry.target}>
        <PathIcon aria-hidden="true" />
        <span>{entry.displayPath}</span>
      </span>
    </li>
  );
}

/** The entries as rows, in the order given (the server's order, D-04). */
export function ProjectList({
  entries,
  variant,
  currentSlug = null,
  now,
}: {
  entries: readonly ProjectListEntry[];
  variant: 'switcher' | 'landing';
  currentSlug?: string | null;
  now?: number;
}): React.JSX.Element {
  return (
    <ul className="project-list">
      {entries.map((entry) => (
        <ProjectRow
          key={entry.slug}
          entry={entry}
          variant={variant}
          current={currentSlug !== null && entry.slug === currentSlug}
          {...(now === undefined ? {} : { now })}
        />
      ))}
    </ul>
  );
}
