// The one project row (D-02, D-03): the landing page, the unknown-project page and (08-11) the header
// switcher all render it. Everything shown comes from the server's list entry; the client never
// guesses a home folder or a project's state. Names, paths and reasons are React text nodes only
// (T-08-22). The row is the 040 winner's arrangement: name over path on the left, load mark over
// last-opened time on the right, an unavailable project's reason on its own line below. No row
// shows a milestone, phase or progress (D-02): listing never loads a project.
import { Check, Folder, Loader, Server } from 'lucide-react';
import type { ProjectListEntry } from '../../presentation/project-list.ts';
import { AppLink } from '../nav.tsx';
import { formatOpenedAgo, openedTitle } from '../opened-ago.ts';
import { projectRootPath } from '../project-path.ts';

/** `landing` adds the last-opened time, which needs the page's clock; `switcher` is the compact row. */
export type ProjectRowVariant = { variant: 'switcher'; now?: undefined } | { variant: 'landing'; now: number };

export type ProjectRowProps = {
  entry: ProjectListEntry;
  /** True for the project whose slug is in the address (never on the landing page). */
  current?: boolean;
} & ProjectRowVariant;

export function ProjectRow({ entry, current = false, variant, now }: ProjectRowProps): React.JSX.Element {
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
      {variant === 'landing' ? (
        <p className="project-row-meta" title={openedTitle(entry.lastOpened) || undefined}>
          {formatOpenedAgo(entry.lastOpened, now)}
        </p>
      ) : null}
    </li>
  );
}

/** The entries as rows, in the order given (the server's order, D-04). */
export function ProjectList({
  entries,
  currentSlug = null,
  variant,
  now,
}: {
  entries: readonly ProjectListEntry[];
  currentSlug?: string | null;
} & ProjectRowVariant): React.JSX.Element {
  return (
    <ul className="project-list">
      {entries.map((entry) => {
        const current = currentSlug !== null && entry.slug === currentSlug;
        return variant === 'landing' ? (
          <ProjectRow key={entry.slug} entry={entry} current={current} variant="landing" now={now} />
        ) : (
          <ProjectRow key={entry.slug} entry={entry} current={current} variant="switcher" />
        );
      })}
    </ul>
  );
}
